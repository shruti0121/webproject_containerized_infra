import {cartUpdate, removeFromCart} from '../Scripts/cart.js';
import {convertDollar } from '../utilities/price-dollars.js' ; 
import  dayjs from 'https://unpkg.com/supersimpledev@8.5.0/dayjs/esm/index.js';
import {renderPaymentSummary } from './payment-summary.js' ; 

let date = dayjs();
let date7 = dayjs().add(7,"day");
let date3 = dayjs().add(3,"day");
let date1 = dayjs().add(1,"day");


export async function renderOrderSummary () {

  let html = ' ' ;
  const accessToken = localStorage.getItem("accessToken"); 
    const payload =
    JSON.parse(atob(accessToken.split('.')[1]));
    const idToken = localStorage.getItem("idToken");

    const response1 = await fetch (
     `${window.APP_CONFIG.api.baseUrl}/cartcount-container-cdk`,
      {
        method:"POST",
        headers: {
          "Authorization": "Bearer " + idToken ,
          "Content-Type": "application/json"
      },
      body:JSON.stringify({
          sub:payload.sub
        })

    } 
);

  
     const result1 = await response1.json(); //database returns items array but we get response object which we will need to concert this inot  JS object which is array of items
     console.log("cart result:", result1);
     console.log("cart length:", result1.length);



     if(result1.length === 0){

      document.querySelector(".js-html-goes-under").innerHTML =
      `
      <h2>Your cart is empty</h2>
      `;
  
      document.querySelector(".order-summary").style.display = "none";
      //await renderPaymentSummary();
  
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
  
      } 
  );
   
    const result2 = await response2.json();


      html += `<div class="item-added js-item-added-${item.product_id.S}"> <!--this is the 1 product box with grey border need it in another box to flex with other products when added -->
            <h2 class="delivery-date">
              Delivery Date: ${item.delivery_date?.S || date.format("dddd, MMMM D")}
              </h2>
            <div class = "product-name"> 
              <div class = "product-image">
                <img src = ${result2.product_image.S}  alt ="tshirts" class="ordered-product">
                </div>
              
               <div class="name"> 
                 <p class="adult">  ${result2.product_name.S}</p>
                 <p class="price"> $
                 
                 ${convertDollar(result2.product_price.N)} </p>
                  <p>  Quantity: ${item.quantity.N} <a class = "update-quanity-link"> Update </a>
                  <a class = "delete-quanity-link" data-product-id= "${item.product_id.S}"> Delete  </a> </p>
               </div>
               <div class="delivery-option"> 
                  <span class="choose-option"> Choose a delivery option:</span>    
                     <label class="round-option">
                       <input type="radio" name= "${item.product_id.S}" value="Tuesday" class = "js-shipping-option" data-shipping-date = "${date7.format("dddd, MMMM D" )} "
                       data-shipping-cost = "0" ${Number(item.shipping_cost?.N) === 0 ? "checked" : ""}>
                      <div class="option-text">
                      <span class="date7">${date7.format("dddd, MMMM D")}</span><br>
                     <span class="shipping">Free Shipping</span>
                    </div>
                    </label>
  
                
  
                   <label class="round-option">
                      <input type="radio" name= "${item.product_id.S}" value="Wednesday"  class = "js-shipping-option" data-shipping-date = "${date3.format("dddd, MMMM D" )}
                      "
                      data-shipping-cost = "499"
                      ${Number(item.shipping_cost?.N) === 499 ? "checked" : ""}>
                        <div class="option-text">
                            <span class="date3"> ${date3.format("dddd, MMMM D" )}</span> <br>
                            <span class="shipping">$4.99-Shipping</span>
                        </div>     
                 </label>
  
  
                  <label class="round-option">
                      <input type="radio" name="${item.product_id.S}"  value="MOnday"  class = "js-shipping-option" data-shipping-date = "${date1.format("dddd, MMMM D" )}"
                      data-shipping-cost = "999"
                       ${Number(item.shipping_cost?.N) === 999 ? "checked" : ""}>
                        <div class="option-text">
                          <span class="date1"> ${date1.format("dddd, MMMM D" )}</span>  <br>
                          <spdan class="shipping js-shipping-price">$9.99-Shipping</span>
  
                        </div>
                    
                 </label>
                 
                  
                </div>
            </div>
             </div>`
      

      };

console.log("afterif"); 
let  checkoutHtml = document.querySelector(".js-html-goes-under");  
//let checkoutheader= document.querySelector(".checkout-header-product-count");
//checkoutheader.innerHTML = `(${result1.length} items)`;
checkoutHtml.innerHTML = html;
console.log("payment")
await renderPaymentSummary();
attachDeleteListeners();
finalShippingCost(); 
}

function attachDeleteListeners(){

  const deleteButtons = document.querySelectorAll(".delete-quanity-link");

  deleteButtons.forEach(button=>{

      button.addEventListener("click", async ()=>{

          const productId = button.dataset.productId;

          await removeFromCart(productId);

          await renderOrderSummary();

      });

  });
}

 

function finalShippingCost(){
  let shippingButton = document.querySelectorAll(".js-shipping-option");
  shippingButton.forEach((radio) => {
    radio.addEventListener("change", async() => {
      const productContainer = radio.closest('.item-added');
      const productId = radio.name; 
      const shippingCost = Number(radio.dataset.shippingCost);
      const deliveryDate = productContainer.querySelector('.delivery-date');
      console.log(deliveryDate);
      deliveryDate.innerHTML = `Delivery Date: ${radio.dataset.shippingDate}`;
      const date = radio.dataset.shippingDate;
      console.log(date);


      const accessToken = localStorage.getItem("accessToken"); 
      const payload =
      JSON.parse(atob(accessToken.split('.')[1]));
      const idToken = localStorage.getItem("idToken");

      const response1 = await fetch (
        `${window.APP_CONFIG.api.baseUrl}/putshipping-container-cdk`,
        {
          method:"POST",
          headers: {
            "Authorization": "Bearer " + idToken,
            "Content-Type": "application/json"
        },
        body:JSON.stringify({
            sub:payload.sub,
            productid:productId,
            cost:shippingCost,
            deliverydate:date
          })

      } 
  );    
    await renderPaymentSummary();
   
      
    });
  });
  
}

