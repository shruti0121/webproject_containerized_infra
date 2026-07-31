import {renderOrderSummary } from '../checkout/order-summary.js';

const menuButton = document.getElementById("menuButton");
const menuDropdown = document.getElementById("menuDropdown");

menuButton.addEventListener("click", () => {
    menuDropdown.classList.toggle("show");
});

console.log(new URL(window.location.href));
renderOrderSummary() ; 
