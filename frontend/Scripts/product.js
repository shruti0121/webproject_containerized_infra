class product  {
  constructor(id , image , name , stars , starCount,priceCents){
    this.id = id;
    this.image =  image ;
    this.name  = name ; 
    this.rating =  {
        stars: stars ,
       starCount: starCount  ,
      } ;
    this.priceCents = priceCents ;

  } 
}

export let productArray = JSON.parse(localStorage.getItem("products"));

if (!productArray){
  productArray = [new product (generateId(),"images/products/athletic-cotton-socks-6-pairs.jpg","Black and Gray Athletic Cotton Socks - 6 Pairs" , 2.0 , 47 , 1090),new product (generateId(),"images/products/intermediate-composite-basketball.jpg","Intermediate Size BasketBall" , 4.5 , 127 , 2095),new product (generateId(),"images/products/adults-plain-cotton-tshirt-2-pack-teal.jpg","Adults Plain Cotton T-shirt - 2 Pack" , 3.5 , 56 , 799),new product (generateId(),"images/products/backpack.jpg","BagPack" , 1.0 , 78 , 2599),new product (generateId(),"images/products/bathroom-rug.jpg" , "Bathroom-rug"  ,4.0 , 54 , 2091),new product (generateId(),"images/products/women-chunky-beanie-gray.webp" ,"Women-chunky-beanie-gray", 3.5 , 32 , 1020),new product (generateId(),"images/products/women-knit-ballet-flat-black.jpg" ,"women-knit-ballet-flat-black", 1.5 , 5 , 4587)];


}

function generateId() {
  return crypto.randomUUID(); // best modern way
}
localStorage.setItem("products", JSON.stringify(productArray)); 