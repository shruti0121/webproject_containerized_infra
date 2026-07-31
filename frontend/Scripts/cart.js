
   export async function cartUpdate(productId){
    const accessToken = localStorage.getItem("accessToken"); 
    const payload =
    JSON.parse(atob(accessToken.split('.')[1]));
    const idToken = localStorage.getItem("idToken");

    const response = await fetch (
      `${window.APP_CONFIG.api.baseUrl}/additemcart-container-cdk`,
      {
        method:"POST",
        headers: {
          "Authorization": "Bearer " + idToken,
          "Content-Type": "application/json"
      },
      body:JSON.stringify({
          sub:payload.sub,
          product_id:productId
  
        })

    } 
);
  }


export async function removeFromCart(productId) {
  const accessToken = localStorage.getItem("accessToken"); 
    const payload =
    JSON.parse(atob(accessToken.split('.')[1]));
    const idToken = localStorage.getItem("idToken");

    const response = await fetch (
      `${window.APP_CONFIG.api.baseUrl}/removeitemcart-container-cdk`,
      {
        method:"POST",
        headers: {
          "Authorization": "Bearer " + idToken,
          "Content-Type": "application/json"
      },
      body:JSON.stringify({
          sub:payload.sub,
          product_id:productId
  
        })

    } 
);
 
  
}



