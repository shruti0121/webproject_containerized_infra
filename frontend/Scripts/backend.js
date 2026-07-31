// const xhr = new XMLHttpRequest();
// xhr.addEventListener('load', () => {
//   console.log(xhr.response);

// });
// xhr.open('GET','https://supersimplebackend.dev/products/first' );
// xhr.send();

async function load() {
  let response =    await fetch("https://supersimplebackend.dev/products")
  const data = await response.json();
    console.log(data);
  
}
load();