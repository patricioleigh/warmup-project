const DB_NAME = process.env.MONGO_INITDB_DATABASE || "warmup";
const RS_NAME = process.env.MONGO_REPLSET_NAME || "rs0";

const RS_HOST = process.env.MONGO_REPLSET_HOST || "mongo:27017"

try {
    rs.initiate({
        _id: RS_NAME,
        members: [{_id: 0, host: RS_HOST}],
    });
} catch(e){
    print("rs.initiate skipped: ", e.message)
}


const appDb = db.getSiblingDB(DB_NAME);

const APP_USER = process.env.MONGO_APP_USER || "app";
const APP_PASS = process.env.MONGO_APP_PASS || "app_pass";

try {
    appDb.createUser({
        user: APP_USER,
        pwd: APP_PASS,
        roles: [{ role: "readwrite", db: DB_NAME}],
    });
} catch(e){
    print("createUser skipped", e.message);
}

appDb.createCollection("healthcheck");
appDb.healthcheck.insertOne({ ok: 1, createAt: new Date() });

print('Mongo init OK.')



