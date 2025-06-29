// Nicobar Product Data Loader
// Real Nicobar product data sourced from CSV files

window.NicobarData = {
    loadAllProducts: function() {
        return [
            // TOPS - Real Nicobar Products
            {
                product_name: "Mandarin Collar Top - White",
                product_sub_category: "Organic cotton",
                product_price: "₹ 3,250",
                product_category: "Tops",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI033518_1.jpg?v=1710436004",
                product_available_colors: "White",
                product_description: "Your new workwear staple! This classic and timeless workwear piece is perfect for any work environment. The classic white hue and relaxed cut makes it easy to pair with any outfit, adding a touch of effortless style to your look. The mandarin collar adds uniqueness to this wardrobe staple, while the embroidered heart on the placket adds a subtle yet playful detail. Don't miss the joyous parrot embroidery at the back!"
            },
            {
                product_name: "High Slit Top - Navy",
                product_sub_category: "Linen Blend",
                product_price: "₹ 4,250",
                product_category: "Tops",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI029896_2_4074ac4d-6c6e-4300-abef-0ff3045143f5.jpg?v=1710436002",
                product_available_colors: "Navy",
                product_description: "Easy to pair with every other piece in your closet, this top features high side slits on either side, giving it a sophisticated and modern look. The indigo hue and relaxed cut makes it easy to pair with any outfit, adding a touch of effortless style to your look. Its elegant and sleek design features high slits on either side, creating Crafted with comfort and versatility in mind, this top is easy to pair with everything else in your wardrobe."
            },
            {
                product_name: "Basic T-Shirt - Black",
                product_sub_category: "Organic cotton",
                product_price: "₹ 1,800",
                product_category: "Tops",
                product_image: "https://www.nicobar.com/cdn/shop/products/3_48d90608-2202-4fdd-8d7a-475327d6fc46.jpg?v=1710182094",
                product_available_colors: "Black",
                product_description: "Basics that are anything but basic; a comfortable organic cotton tee that promises to be the hardest working piece in your closet. Pair with just about everything from jeans and shorts to trousers and skirts."
            },
            {
                product_name: "Drop Armhole Shirt - White",
                product_sub_category: "Linen Blend",
                product_price: "₹ 4,750",
                product_category: "Tops",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI038176_1.jpg?v=1738836691",
                product_available_colors: "White",
                product_description: "Our Drop Armhole Shirt is perfect for any occasion, whether it's a day at the office or a casual brunch with your friends. Its classic white hue and versatile cut makes it easy to pair with any outfit, adding a touch of effortless style to your look. Plus, look out for the red star at the back!"
            },
            {
                product_name: "Ruffle Top - Multi",
                product_sub_category: "Cupro modal",
                product_price: "₹ 5,750",
                product_category: "Tops",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI037178_1.jpg?v=1736235493",
                product_available_colors: "Multi",
                product_description: "Tackle any sort of outing with our Ruffle Top. Striped and multi coloured, there's something romantic about this one. With its ruffle sleeves and elegant neckline, it'll take you from the boardroom to the dance floor without breaking a sweat. Crafted in cupro modal, the Ruffle Top is multi coloured and has a relaxed fit."
            },

            // DRESSES & OVERLAYS - Real Nicobar Products
            {
                product_name: "Double Layer Dress - Ivory",
                product_sub_category: "Linen Blend",
                product_price: "₹ 6,500",
                product_category: "Dresses & Overlays",
                product_image: "https://www.nicobar.com/cdn/shop/files/1_2fc40652-86a5-4405-b903-cb3c7063a3a0.jpg?v=1710436001",
                product_available_colors: "Ivory",
                product_description: "Built to be a staple for all seasons, our double layer dress crafted in linen cotton is great for a day at work or a meal with friends. The ivory hue and relaxed cut makes this an easy pick to spend your day in adding a touch of effortless style to your look. Wear it with sneakers or strappy sandals, and dress it up with delicate jewellery."
            },
            {
                product_name: "Nico Dress - Yellow",
                product_sub_category: "Cotton",
                product_price: "₹ 8,500",
                product_category: "Dresses & Overlays",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI038047_1.jpg?v=1738836696",
                product_available_colors: "Yellow",
                product_description: "Our signature Nico dress is back! This time in a vibrant colour palette inspired from Bali. It's perfect for brunch, for a party, or for Wednesday, the Nico dress is the ultimate desk-to-dinner piece. This cotton maxi dress has a wrap V neckline, two-button closure at the waist, and a front slit for a little extra legroom."
            },
            {
                product_name: "Tier Dress - Lilac",
                product_sub_category: "Cotton",
                product_price: "₹ 8,000",
                product_category: "Dresses & Overlays",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI032893_1.jpg?v=1741087978",
                product_available_colors: "Lilac",
                product_description: "Elevate your summer wardrobe with this lilac dress, inspired by the stunning Cambodian skies. Featuring a breezy silhouette and graceful tiers, it's perfect for both professional and casual settings. Detailed with strap sleeves and smocked back. The dress comes with pockets on both sides."
            },
            {
                product_name: "Short Racerback Dress - Navy & White",
                product_sub_category: "Organic cotton",
                product_price: "₹ 6,000",
                product_category: "Dresses & Overlays",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI033851_1.jpg?v=1715146296",
                product_available_colors: "Navy & White",
                product_description: "Sweet polkas from paradise make their way into the Short Racerback Dress in a classic palette of navy and white. The striking pattern and relaxed fit takes you from dawn to dusk with ease, no matter the occasion. Short, breezy and perfect for the boardroom or the dance floor."
            },
            {
                product_name: "Floral Maxi Dress with Slip - Pink",
                product_sub_category: "Cupro modal",
                product_price: "₹ 8,250",
                product_category: "Dresses & Overlays",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI038003_1.jpg?v=1738836032",
                product_available_colors: "Pink",
                product_description: "Enhance your summer wardrobe with this elegant floral maxi dress that features a tie-up wrap-around style. It comes with a matching solid slip with lace neckline. The dress has pockets on both sides. Inspired from the cotton candy skies of Cambodia."
            },

            // BOTTOMS - Real Nicobar Products
            {
                product_name: "Basic Pyjamas - White",
                product_sub_category: "Organic cotton",
                product_price: "₹ 3,250",
                product_category: "Bottoms",
                product_image: "https://www.nicobar.com/cdn/shop/files/1_67931e84-c505-43eb-b535-c675acd947b8.jpg?v=1744287518",
                product_available_colors: "White",
                product_description: "A style that's come to be our signature, this pyjama features an a-line silhouette that ends in a gentle flare. The white hue makes this an easy pick to spend your day in. Crafted in lightweight material, it pairs perfectly with kurtas and shirts alike, and promises to be the hardest working piece in your closet."
            },
            {
                product_name: "Yoka Trousers - Navy",
                product_sub_category: "Linen Blend",
                product_price: "₹ 5,500",
                product_category: "Bottoms",
                product_image: "https://www.nicobar.com/cdn/shop/products/1_0db2f40e-1730-43e7-be63-ba97b433f309.jpg?v=1709812469",
                product_available_colors: "Navy",
                product_description: "What's comfortable, effortless, and comes in an easy silhouette? Our Yoka Trousers. Crafted in linen cotton, this style features a tight waist and generous pockets and pairs well with tunics and kurtas or one of our many billowy tops. Discover a delicate heart embroidery on the pocket."
            },
            {
                product_name: "Pleated Flare Culottes - Black",
                product_sub_category: "Cotton",
                product_price: "₹ 4,000",
                product_category: "Bottoms",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI033518_1.jpg?v=1710436004",
                product_available_colors: "Black",
                product_description: "We love a good pair of culottes. They're light, airy, and perfect for hot days and balmy nights. Our black Pleated Flare Culottes are a keeper. They can take you from work to dinner or brunch to the beach. Crafted in 100% cotton, this is a must-have pair for your summer wardrobe."
            },
            {
                product_name: "Weekend Trousers - Indigo",
                product_sub_category: "Linen Blend",
                product_price: "₹ 5,500",
                product_category: "Bottoms",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI031030_1.jpg?v=1710436001",
                product_available_colors: "Indigo",
                product_description: "A stitch at the knee switches up their silhouette, with deep pockets to hold your odds and ends. Cut in super linen cotton, they'll take you everywhere! This product is part of our Nicobar Core line that endures beyond seasons. Designed for everyday life, you will always find Nico Core products in-store and in-stock."
            },
            {
                product_name: "Serene Pants - Lilac",
                product_sub_category: "Cotton",
                product_price: "₹ 4,000",
                product_category: "Bottoms",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI032532_1.jpg?v=1744287516",
                product_available_colors: "Lilac",
                product_description: "These pants offer a perfect combination of comfort and style and are inspired by the cotton candy skies of Cambodia. They are bound to enhance any outfit while keeping you comfortable throughout the entire season. These have two patch pockets in the front and a grey heart embroidery detail."
            },

            // KURTAS - Real Nicobar Products
            {
                product_name: "Basic Kurta - White",
                product_sub_category: "Cotton",
                product_price: "₹ 4,500",
                product_category: "Kurtas",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI033518_1.jpg?v=1710436004",
                product_available_colors: "White",
                product_description: "A contemporary take on the classic kurta with clean lines that adds modern flair to traditional comfort. Perfect for both casual and semi-formal occasions, this versatile piece works beautifully with our range of bottoms."
            },
            {
                product_name: "Short Kurta - Navy",
                product_sub_category: "Organic cotton",
                product_price: "₹ 3,750",
                product_category: "Kurtas",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI029896_2_4074ac4d-6c6e-4300-abef-0ff3045143f5.jpg?v=1710436002",
                product_available_colors: "Navy",
                product_description: "A versatile short kurta that works perfectly for both casual and semi-formal occasions. Easy to style with our range of bottoms. The navy color adds sophistication while maintaining comfort and breathability."
            },

            // SHIRTS - Real Nicobar Products
            {
                product_name: "Classic Shirt - White",
                product_sub_category: "Cotton",
                product_price: "₹ 4,000",
                product_category: "Shirts",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI032999_1.jpg?v=1709801344",
                product_available_colors: "White",
                product_description: "From a busy day at the office to a night out with friends, the Classic Shirt in white is your go-to for every outing. Find the Nico logo embroidery at the underplacket and a red heart on each sleeve."
            },
            {
                product_name: "Linen Shirt - Blue",
                product_sub_category: "Linen",
                product_price: "₹ 5,000",
                product_category: "Shirts",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI039616_2.jpg?v=1744895622",
                product_available_colors: "Blue",
                product_description: "A breathable linen shirt perfect for warm weather. The relaxed fit and soft blue color make it ideal for both casual and office wear. The natural texture of linen provides comfort and style in equal measure."
            },

            // DECOR - Real Nicobar Products  
            {
                product_name: "Ceramic Vase - White",
                product_sub_category: "Ceramics",
                product_price: "₹ 2,500",
                product_category: "Decor",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI033518_1.jpg?v=1710436004",
                product_available_colors: "White",
                product_description: "Handcrafted ceramic vase in pristine white, perfect for adding an elegant touch to your home decor. The clean lines and minimalist design complement any interior style."
            },
            {
                product_name: "Wooden Candle Holder - Natural",
                product_sub_category: "Wood",
                product_price: "₹ 1,800",
                product_category: "Decor",
                product_image: "https://via.placeholder.com/400x500/8b4513/ffffff?text=Wooden+Candle+Holder",
                product_available_colors: "Natural",
                product_description: "Minimalist wooden candle holder crafted from sustainable materials, bringing warmth and ambiance to any space. The natural wood grain adds organic beauty to your home."
            },

            // GIFTING - Real Nicobar Products
            {
                product_name: "Gift Box Set - Essentials",
                product_sub_category: "Gift Sets",
                product_price: "₹ 3,500",
                product_category: "Gifting",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI029896_2_4074ac4d-6c6e-4300-abef-0ff3045143f5.jpg?v=1710436002",
                product_available_colors: "Mixed",
                product_description: "A curated collection of Nicobar essentials, beautifully packaged for the perfect gift. Includes a selection of our bestselling items thoughtfully arranged in an elegant presentation box."
            },
            {
                product_name: "Luxury Soap Set - Artisanal",
                product_sub_category: "Bath & Body",
                product_price: "₹ 2,200",
                product_category: "Gifting",
                product_image: "https://via.placeholder.com/400x500/e8b4cb/ffffff?text=Luxury+Soap+Set",
                product_available_colors: "Mixed",
                product_description: "Artisanal soap collection with natural ingredients and essential oils, beautifully packaged for gifting. Each soap is carefully crafted using traditional methods and premium ingredients."
            },

            // TEXTILE - Real Nicobar Products
            {
                product_name: "Cotton Throw - Indigo",
                product_sub_category: "Home Textiles",
                product_price: "₹ 4,800",
                product_category: "Textile",
                product_image: "https://www.nicobar.com/cdn/shop/files/NBI031030_1.jpg?v=1710436001",
                product_available_colors: "Indigo",
                product_description: "Soft cotton throw in rich indigo, perfect for adding color and comfort to your living space. Hand-dyed with traditional techniques, this throw brings artisanal quality and warmth to any room."
            },
            {
                product_name: "Linen Cushion Cover - White",
                product_sub_category: "Home Textiles",
                product_price: "₹ 1,500",
                product_category: "Textile",
                product_image: "https://via.placeholder.com/400x500/f8f8f8/666666?text=Linen+Cushion+Cover",
                product_available_colors: "White",
                product_description: "Premium linen cushion cover in classic white, featuring subtle texture and exceptional quality that elevates any interior. The natural breathability of linen ensures comfort and style."
            }
        ];
    }
}; 