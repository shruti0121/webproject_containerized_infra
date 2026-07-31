import { DynamoDBClient, UpdateItemCommand} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-1"
});

export const handler = async (event) => {
console.log(event)

  const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "OPTIONS,POST"
  };


  for(const record of event.Records) {
      console.log(record);

      const body = JSON.parse(record.body);

      const snsMessage = JSON.parse(body.Message);
      console.log(snsMessage);
        for(const product of snsMessage.products){
          try {
              console.log(product);
            const result =  await client.send( new UpdateItemCommand(
                 {
                     TableName: "Ricemill_product_inventory_cdk",
                     Key: {
                         product_id: { S: product.product_id }
                     },
                     UpdateExpression: "SET #prod_quantity = #prod_quantity - :quantity",
                     ExpressionAttributeNames: {
                      "#prod_quantity": "prod_quantity"
                  },
                     ExpressionAttributeValues: {
                         ":quantity": { N: String(product.quantity) }
                     }
                 }
            )
            
            )
     
     
             return {
     
                 statusCode: 201,
     
                 headers: corsHeaders,
             };
     
     
         } catch (error) {
     
             console.error(error);
     
     
             return {
     
                 statusCode: 500,
     
                 headers: corsHeaders,
     
                 body: JSON.stringify({
                     message: error.message
                 })
             };
         }
          
        }

  }
 


  
};