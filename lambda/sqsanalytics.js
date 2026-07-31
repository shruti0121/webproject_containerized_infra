import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
    region: "us-east-1"
});

export const handler = async (event) => {

    console.log(event);

    for (const record of event.Records) {

        try {

            // SQS body contains SNS message
            const body = JSON.parse(record.body);

            // SNS Message field is a string, so parse again
            const snsMessage = JSON.parse(body.Message);

            console.log(snsMessage);

            let producttotal = 0;

            for (const product of snsMessage.products) {
                producttotal += product.quantity;
            }


            // Increment total orders
            await client.send(
                new UpdateItemCommand({
                    TableName: "Ricemill_analytics_v3_cdk",

                    Key: {
                        metric_name: {
                            S: "total_orders"
                        }
                    },

                    UpdateExpression:
                        "SET #value = #value + :amount",

                    ExpressionAttributeNames: {
                        "#value": "value"
                    },

                    ExpressionAttributeValues: {
                        ":amount": {
                            N: "1"
                        }
                    }
                })
            );


            // Increment revenue
            await client.send(
                new UpdateItemCommand({
                    TableName: "Ricemill_analytics_v3_cdk",

                    Key: {
                        metric_name: {
                            S: "total_revenue"
                        }
                    },

                    UpdateExpression:
                        "SET #value = #value + :amount",

                    ExpressionAttributeNames: {
                        "#value": "value"
                    },

                    ExpressionAttributeValues: {
                        ":amount": {
                            N: String(snsMessage.ordertotal)
                        }
                    }
                })
            );


            // Increment products sold
            await client.send(
                new UpdateItemCommand({
                    TableName: "Ricemill_analytics_v3_cdk",

                    Key: {
                        metric_name: {
                            S: "products_sold"
                        }
                    },

                    UpdateExpression:
                        "SET #value = #value + :amount",

                    ExpressionAttributeNames: {
                        "#value": "value"
                    },

                    ExpressionAttributeValues: {
                        ":amount": {
                            N: String(producttotal)
                        }
                    }
                })
            );


            console.log("Analytics updated successfully");


        } catch (error) {

            console.error("Analytics update failed:", error);

            // Important:
            // Throwing error tells Lambda/SQS:
            // "do not delete this message, retry it"
            throw error;
        }
    }


    return {
        message: "All analytics updated"
    };
};