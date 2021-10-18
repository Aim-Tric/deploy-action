const core = require("@actions/core");
const github = require("@actions/github");
const ssh = require("ssh2");
const fs = require("fs");

try {
  const serverIp = core.getInput("server_ip"); // 服务器ip
  const user = core.getInput("server_user"); // 用户名
  const sshKey = core.getInput("ssh_key"); // ssh秘钥
  const source = core.getInput("source"); // 文件目录
  const uploadRemote = core.getInput("upload_remote"); // 上传目录
  const target = core.getInput("target"); // 项目目录
  // 连接ssh
  let conn = new ssh.Client();
  conn
    .on("ready", () => {
      conn.shell(function (err, stream) {
        if (err) {
          core.setFailed(err.message);
          return;
        }
        stream.write(`cd ${target}\n`);
        stream.write("pm2 stop all\n");
        conn.sftp((err, sftp) => {
          if (err) throw err;
          sftp.fastPut(source, uploadRemote, () => {
            stream.write(`cd ${target}\n`);
            stream.write("cnpm install\n");
            stream.write("pm2 start all\n");
            stream.write("echo 'action:done:exit'");
          });
        });
        stream.on("data", function (data) {
          if (data.toString().includes("action:done:exit")) {
            console.log("finish");
            stream.end();
            conn.end();
          }
        });
      });
    })
    .connect({
      host: serverIp,
      port: 22,
      username: user,
      privateKey: sshKey,
    });
} catch (error) {
  core.setFailed(error.message);
}
