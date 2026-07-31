import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
    region: "us-east-1"
});


export const handler = async (event) => {

    console.log(event);

    for (const record of event.Records) {

        // SQS body contains the SNS message
        const snsMessage = JSON.parse(record.body);

        console.log("SNS message:", snsMessage);


        // SNS wraps your original message inside Message
        const order = JSON.parse(snsMessage.Message);


        const orderId = order.orderid;
        const userId = order.userid;
        const totalCost = order.ordertotal;


        const params = {
            Source: "shrutisingla268@gmail.com",
        
            Destination: {
                ToAddresses: [
                    "ruhichawla268@gmail.com"
                ]
            },
        
            Message: {
                Subject: {
                    Data: "Your Rice Mill Order Confirmation from CDK-CI-CD-main"
                },
        
                Body: {
                    Html: {
                        Data: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;">
        
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.1);">
        
            <div style="background:#2d6a4f; color:white; padding:20px; text-align:center;">
                <h1>Kanta Devi Rice Mill</h1>
            </div>
        
            <div style="padding:30px;">
        
                <h2>Thank you for your order!</h2>
        
                <p>Your order has been successfully placed.</p>
        
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td><strong>Order ID</strong></td>
                        <td>${orderId}</td>
                    </tr>
        
                     
        
                    <tr>
                        <td><strong>Total</strong></td>
                        <td>$${totalCost}</td>
                    </tr>
                </table>
        
                
        
                <p>
                    We are preparing your order and will notify you when it ships.
                </p>
        
                <div style="text-align:center; margin-top:30px;">
                    <a href="https://ricemill.shruti-singla.com/orders2.html"
                       style="
                            background:#ff9900;
                            color:white;
                            text-decoration:none;
                            padding:12px 24px;
                            border-radius:6px;
                            display:inline-block;
                       ">
                        View Your Orders
                    </a>
                </div>
        
            </div>
        
            <div style="background:#eeeeee; padding:15px; text-align:center; color:#666;">
                © 2026 Kanta Devi Rice Mill
            </div>
        
        </div>
        
        </body>
        </html>
        `
                    },
        
                    Text: {
                        Data: `
        Your order has been placed.
        
        Order ID: ${orderId}
        Total: $${totalCost}
        
        Thank you for shopping with us.
        `
                    }
                }
            }
        };

        console.log("Sending email");
        await sesClient.send(
            new SendEmailCommand(params)
        );
        console.log("Email sent");
    }


    return {
        statusCode: 200,
        body: "Emails sent"
    };
};