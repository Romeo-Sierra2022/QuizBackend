import AWS from "aws-sdk";
import express, { json, urlencoded } from "express";

const app = express();
const PORT = 8080;

app.use(json());
app.use(urlencoded({ extended: true }));

app.post("connect", async (req, res) => {
    console.log("connect Endpoint Invoked");
    res.sendStatus(200);
    // const tableName = req.body.tableName;
    // const region = req.body.region;
    // const connectionId = req.body.connectionId;

    // console.log("tableName: ", tableName);
    // console.log("region: ", region);
    // console.log("connectionId: ", connectionId);

    // const ddb = new AWS.DynamoDB.DocumentClient({
    //     apiVersion: "2012-08-10",
    //     region,
    // });
    // const putParams = {
    //     TableName: tableName,
    //     Item: { connectionId },
    // };
    // try {
    //     await ddb.put(putParams).promise();
    //     console.info(`User ${connectionId} has joined`);
    //     res.sendStatus(200);
    // } catch (err) {
    //     console.error({ result: "Failed to connect", error: err });
    // }
});

app.post("delete", async (req, res) => {
    console.log("delete Endopoint Invoked");
    const tableName = req.body.tableName;
    const region = req.body.region;
    const connectionId = req.body.connectionId;

    console.log("tableName: ", tableName);
    console.log("region: ", region);
    console.log("connectionId: ", connectionId);

    const ddb = new AWS.DynamoDB.DocumentClient({
        apiVersion: "2012-08-10",
        region,
    });
    const deleteParams = {
        TableName: tableName,
        Key: { connectionId },
    };
    try {
        await ddb.delete(deleteParams).promise();
        console.info(`User ${connectionId} has left`);
        res.sendStatus(200);
    } catch (err) {
        console.error({ result: "Failed to connect", error: err });
    }
});
app.post("message", async (req, res) => {
    console.log("message Endpoint Invoked");
    const tableName = req.body.tableName;
    const region = req.body.region;
    const connectionId = req.body.connectionId;
    const domainName = req.body.domainName;
    const stage = req.body.stage;
    const postData = req.body.payload.message;

    console.log("tableName: ", tableName);
    console.log("region: ", region);
    console.log("connectionId: ", connectionId);
    console.log("domainName: ", domainName);
    console.log("stage: ", stage);
    console.log("message: ", postData);

    const ddb = new AWS.DynamoDB.DocumentClient({
        apiVersion: "2012-08-10",
        region,
    });

    let connectionData;

    try {
        connectionData = await ddb
            .scan({ tableName, ProjectionExpression: "connectionId" })
            .promise();
    } catch (err) {
        console.error({ result: "Failed to connect", error: err });
        res.sendStatus(500);
    }

    const apiEndpoint = domainName + "/" + stage;
    console.log("API Endpoint: ", apiEndpoint);

    const apigwManagementAPI = new AWS.ApiGatewayManagementApi({
        apiVersion: "2018-11-29",
        region: region,
        endpoint: apiEndpoint,
    });

    const postCalls = connectionData.Items.map(async ({ connectionId }) => {
        try {
            await apigwManagementAPI
                .postToConnection({
                    ConnectionId: connectionData,
                    Data: postData,
                })
                .promise();
        } catch (err) {
            if (err.statusCode === 410) {
                console.log("Found stale connection, deleting", connectionId);
                await ddb
                    .delete({ TableName: tableName, Key: { connectionId } })
                    .promise();
            } else {
                throw err;
            }
        }
    });
});
app.listen(PORT, () => console.log(`Listening on Port: ${PORT}`));
