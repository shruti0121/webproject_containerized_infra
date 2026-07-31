async function renderorder(){
  let html = ' ';

  const accessToken = localStorage.getItem("accessToken");
  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  const idToken = localStorage.getItem("idToken");


  const response = await fetch(
      `${window.APP_CONFIG.api.baseUrl}/putorders-container-cdk?user_id=${payload.sub}`,
      {
          method:"GET",
          headers:{
              "Authorization": "Bearer " + idToken
          }
      }
  );

  const orders = await response.json();
  console.log("orders:",orders);


  for(const order of orders){


      let productsHTML = "";
      console.log(order.products.L);
 

      for(const product of order.products.L){  //products is an array


        //need to make another api call to get the peoduct make 
        console.log("product",product);

        const response = await fetch(
          `${window.APP_CONFIG.api.baseUrl}/product-container-cdk/${product.M.productid.S}`,
          {
              method:"GET",
              headers:{
                  "Authorization": "Bearer " + idToken
              }
          }
      );

      const product_details = await response.json();
      console.log("single product:",product_details);
 


          productsHTML += `

          <div class="product-row">

              <div>

                  <p class="product-name">
                      ${product_details.product_name.S}
                  </p>

                  <p class="product-detail">
                      Quantity: ${Number(product.M.quantity.N)}
                  </p>

              </div>


              <div class="delivery">
                  Delivery: ${product.M.deliverydate.S}
              </div>


          </div>

          `;

      }



      html += `
        <div class="order-card">
      <div class="order-header">


              <div>
                  <p class="label">Order ID</p>
                  <p class="value">
                      ${order.order_id.S}
                  </p>
              </div>


              <div>
                  <p class="label">Placed</p>
                  <p class="value">
                  ${order.orderplaceddate.S.split("T")[0]}
                  </p>
              </div>


              <div>
                  <p class="label">Shipping Cost</p>
                  <p class="value">
                      $${order.shipping_cost}
                  </p>
              </div>


              <div>
                  <p class="label">Status</p>
                  <p class="status">
                      ${order.status.S}
                  </p>
              </div>


              <div class="order-total">

                  <p class="label">Total</p>

                  <p class="price">
                      $${Number(order.totalcost.N)}
                  </p>

              </div>


          </div>



          <hr>


          <div class="products">

              <h3>Products</h3>

              ${productsHTML}

          </div>  
          </div>`;

  }


  document.querySelector(".order-container").innerHTML = html;

}
const menuButton = document.getElementById("menuButton");
const menuDropdown = document.getElementById("menuDropdown");

menuButton.addEventListener("click", () => {
    menuDropdown.classList.toggle("show");
});

renderorder();