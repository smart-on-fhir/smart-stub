var sqlite3 = require("sqlite3");

module.exports = function(method,path){
  if (method === "sqlite") {
    return SqliteMethod(path);
  }

  throw "Unrecognized database method: " + method;
};

function SqliteMethod(path) {
  var db = new sqlite3.Database(path);
  db.serialize();

  var columns = [
    "client_id TEXT",
    "access_token TEXT",
    "refresh_token TEXT",
    "iat INTEGER",
    "exp INTEGER"
  ];
  db.run("CREATE TABLE IF NOT EXISTS token (" + columns.join(", ") + ")");

  return {
    run: function () {
      var args = Array.from(arguments);

      return new Promise(function (resolve, reject) {
        args.push(function (err) {
          (err) ? reject(err) : resolve(this);
        });

        db.run.apply(db, args);
      });
    },

    get: function () {
      var args = Array.from(arguments);

      return new Promise(function (resolve, reject) {
        args.push(function (err, row) {
          console.log("DB.GET", err, row, this, args);
          (row) ? resolve(row) :
            (err) ? reject(err) : reject(row);
        });

        db.get.apply(db, args);
      });
    }
  };
}
