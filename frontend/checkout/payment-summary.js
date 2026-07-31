import { renderOrderSummary } from "./order-summary.js";


export async function renderPaymentSummary() {
  let html = ' ';
 

  let itemTotal = 0; 
  let shippingCost = 0;
  let BeforeTax = 0;
  let AfterTax = 0;
  let  totalCents = 0;

  const accessToken = localStorage.getItem("accessToken"); 
  const payload =
  JSON.parse(atob(accessToken.split('.')[1]));
  const idToken = localStorage.getItem("idToken");

  const response1 = await fetch (
    `${window.APP_CONFIG.api.baseUrl}/cartcount-container-cdk`,
    {
      method:"POST",
      headers: {
        "Authorization": "Bearer " + idToken,
        "Content-Type": "application/json"
    },
    body:JSON.stringify({
        sub:payload.sub
      })

  } 
);

// response1 returns product_id , quantity, user_id 

 const result1 = await response1.json(); //quantity:"2"
 console.log(result1);
 console.log(typeof(response1))





 if(result1.length === 0){

  let orderSummary = document.querySelector(".order-summary");
  orderSummary.innerHTML = " ";

  return;
}


for (const item of result1){
  console.log(item.product_id) // this is  {S: 'prod_001'}
  
  //now we need to get the other product details so we make another api request to products table

  const response2 = await fetch (
    `${window.APP_CONFIG.api.baseUrl}/product-container-cdk`,
    {
      method:"POST",
      headers: {
        "Authorization": "Bearer " + idToken,
        "Content-Type": "application/json"
    },
    body:JSON.stringify({
        productid:item.product_id
      })

  });



  const result2 = await response2.json(); //this returns product js object 

  let quantity = Number(item.quantity.N);
  itemTotal += (quantity* Number(result2.product_price.N)) ;
  shippingCost += Number(item.shipping_cost?.N || 0);

 }
   

 BeforeTax = itemTotal + shippingCost;
 AfterTax = BeforeTax * 0.1;
 totalCents = BeforeTax + AfterTax;
  
 html += `<h3 class="heading-order"> Order Summary</h3>
           <div class="checkout-final">
            <div class="items-checkout"> 
                <span class="items" > items(${result1.length}):</span>
                <span class="price" > $${(itemTotal/100).toFixed(2)} </span>
            </div>

            <div         class="shipping"> 
              <span class="handling" > Shipping and handling:</span>
              <span class="price" > $${(shippingCost/100).toFixed(2)}</span>
            </div>

           <div class="total"> 
              <span class="tax" > Total before tax:</span>
              <span class="price" > $${(BeforeTax/100).toFixed(2)} </span>
            </div>

            <div class="estimated"> 
                <span class="estimated-tax" >Estimated Tax:</span>
                <span class="price" > $${(AfterTax /100).toFixed(2)} </span>
           </div>

           </div>
          
           <!-- order total-->
           <div class = "order-total">

            <div   class="order-total-text"> 
              <span >Order Total:</span>
              <span class="price" > $${(totalCents/100).toFixed(2)} </span>
           </div>
           </div>
            <button class = "placeorder"> Place your order </button> 
           `;    //this needs to make API call to ricemill/orders and add the order in the orders table in addition once we get response back then we do window.href to order-confirm.html 
          
        
           let orderSummary = document.querySelector(".order-summary");
           orderSummary.innerHTML = html;

          
        





           let placeorder = document.querySelector(".placeorder");
           function validateShippingOptions(){

            const products = document.querySelectorAll(".item-added");
          
            for(const product of products){
          
              const selectedShipping = product.querySelector(
                ".js-shipping-option:checked"
              );
          
              if(!selectedShipping){
                return false;
              }
          
            }
          
            return true;
          }


          
           placeorder.addEventListener( "click", async() => {

            if(!validateShippingOptions()){

              alert("Please choose a shipping option for every product.");
          
              return;
          
            }

            const products = result1.map(item => {

              const selectedOption = document.querySelector(
                  `input[name="${item.product_id.S}"]:checked`
              );
          
              return {
                  product_id: item.product_id.S,
                  quantity: Number(item.quantity.N),
                  shipping_cost: Number(selectedOption.dataset.shippingCost),
                  delivery_date: selectedOption.dataset.shippingDate
              };
          });

            const response = await fetch (
              `${window.APP_CONFIG.api.baseUrl}/putorders-container-cdk?user_id=${payload.sub}`,
             
              {
                method:"POST",
                headers: {
                  "Authorization": "Bearer " + idToken,
                  "Content-Type": "application/json"
              },
              body:JSON.stringify({
               
                  products:products,
                  totalcost:(totalCents/100).toFixed(2),
                  dateplaced: new Date().toISOString(),
                  status:"placed",
          
                })
        
            } 
        );

        if (response.ok) {
          const result = await response.json();
          console.log("Order created:", result);
          await renderPaymentSummary();
          await renderOrderSummary();
  
          // redirect after successful order creation
         // window.location.href = "../order-confirm.html";
      } else {
          const error = await response.json();
          console.error("Order failed:", error);
          alert("Unable to place order");
      }

           })
}

