
let  html = ' ' ; 
import {cartUpdate} from './cart.js';
import {convertDollar} from '../utilities/price-dollars.js' ; 
//import {productArray} from './product.js';

 async function loadProducts(){
  const accessToken = localStorage.getItem("accessToken"); 
  console.log("accessToken"); 
  const idToken = localStorage.getItem("idToken");
  console.log(idToken);

  const response = await fetch(
    `${window.APP_CONFIG.api.baseUrl}/product-container-cdk`,
    {
      method: "GET",
      headers: {
          "Authorization": "Bearer " +idToken ,
          "Content-Type": "application/json"
      },
      
  })

const productArray = await response.json(); //we do not get json directly we get response object which is in JSON so we use response.json() to conver it into JS object

productArray.forEach ((product , index) => {
 
  html = html + ` <div class =  "items" >
       <div>
           <img
           src = ${product.product_image.S}
           alt ="Intermediate Size BasketBall"
           class = "product-image"
           />
       </div>
       <div class = "product-name"> ${product.product_name.S}</div>
     
       <div class = "price"> ${convertDollar(product.product_price.N)} </div>
     
       <button class = "add-to-cart js-add-to-cart" data-product-id = "${product.prod_id.S}"  > Add to cart </button>
 </div> ` ; 
})


const productText =  document.querySelector(".js-shop-section");
productText.innerHTML = html;



const addToCart = document.querySelectorAll(".js-add-to-cart");
const cartCountdisplay = document.querySelector(".js-cart-count");


cartCountfromcart();

addToCart.forEach((button) => {
  
  button.addEventListener("click",async() => {   
     console.log(button.dataset)
    const productId = button.dataset.productId;  //returns the productId such as prod_001 , prod_002 
    console.log(productId)
     await cartUpdate(productId );  
    await cartCountfromcart();     
  })
})

 async function cartCountfromcart () {  
  let cartCount = 0;
  const accessToken = localStorage.getItem("accessToken"); 
    const payload =
    JSON.parse(atob(accessToken.split('.')[1]));

    const response = await fetch (
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

     console.log(response)
     const result = await response.json(); //database returns items array but we get response object which we will need to concert this inot  JS object which is array of items
     result.forEach((item) => { 
      cartCount = cartCount + Number(item.quantity.N);

     });
     cartCountdisplay.innerText = cartCount;
   
}



 }

 const menuButton = document.getElementById("menuButton");
 const menuDropdown = document.getElementById("menuDropdown");
 
 menuButton.addEventListener("click", () => {
     menuDropdown.classList.toggle("show");
 });
 
 document.addEventListener("click", (event) => {
 
     if (
         !menuButton.contains(event.target) &&
         !menuDropdown.contains(event.target)
     ) {
         menuDropdown.classList.remove("show");
     }
 
 });
 loadProducts()
