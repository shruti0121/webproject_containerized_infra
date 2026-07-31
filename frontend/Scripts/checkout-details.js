let input = document.querySelectorAll(".input") ;
let button = document.querySelector(".Submit-order");

button.addEventListener("click", () => {
for( let inputValue of input ){
  if(inputValue.value.trim() === "") {
    alert("Please fill in all the mandatory fields");
    return;
  }


}
window.location.href = ("../payment-details.html");


})
