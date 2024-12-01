require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

const { initializeDatabase } = require("./db");
//const fs = require('fs')
const Book = require("./models/books.models");
const Category = require("./models/category.models");
const Product = require("./models/products.models");
const Cart = require("./models/cart.models");
const Wishlist = require("./models/wishlist.models");
const User = require("./models/user.models");
const Address = require("./models/address.models");

app.use(express.json());

initializeDatabase();
app.get("/", (req, res) => {
  res.send("Hello, Express!");
});

// const jsonData = fs.readFileSync("products.json", "utf8")
// const productsData = JSON.parse(jsonData)
// function seedData() {
//   try {
//     for (const productData of productsData) {
//       const newProduct = new Product({
//         title: productData.title,
//         author: productData.author,
//         publishedYear: productData.publishedYear,
//         genre: productData.genre,
//         language: productData.language,
//         country: productData.country,
//         rating: productData.rating,
//         summary: productData.summary,
//         coverImageUrl: productData.coverImageUrl,
//       });
//       newProduct.save();
//       console.log("new product", newProduct.title);
//     }
//   } catch (error) {
//     console.log("error seeding the data", error);
//   }
// }

// seedData();

async function createProduct(newProduct) {
  try {
    const product = new Product(newProduct);
    const savedProduct = await product.save();
    return savedProduct;
  } catch (error) {
    throw error;
  }
}
app.post("/products", async (req, res) => {
  try {
    const savedProduct = await createProduct(req.body);
    res
      .status(201)
      .json({ message: "Book added successfully.", product: savedProduct });
  } catch (error) {
    console.log("error in saving book:", error);
    res
      .status(500)
      .json({ error: "failed to add new book.", details: error.message });
  }
});

//category adding
async function createCategory(newCategory) {
  try {
    const category = new Category(newCategory);
    const savedCategory = await category.save();
    return savedCategory;
  } catch (error) {
    throw error;
  }
}
app.post("/categories", async (req, res) => {
  try {
    const savedCategory = await createCategory(req.body);
    res.status(201).json({
      message: "category added successfully.",
      category: savedCategory,
    });
  } catch (error) {
    console.log("error in saving category:", error);
    res
      .status(500)
      .json({ error: "failed to add new category.", details: error.message });
  }
});

//get products
async function getAllProducts() {
  try {
    const allProducts = await Product.find();
    return allProducts;
  } catch (error) {
    console.log("error in fetching books", error);
  }
}

app.get("/products", async (req, res) => {
  try {
    const products = await getAllProducts();
    if (products.length != 0) {
      res.json(products);
    } else {
      res.status(404).json({ error: "No books found." });
    }
  } catch (error) {
    res.status(500).json({ error: "failed to fetch books." });
  }
});
//get categories
async function getAllCategories() {
  try {
    const allCategories = await Category.find();
    return allCategories;
  } catch (error) {
    console.log("error in fetching categories", error);
  }
}

app.get("/categories", async (req, res) => {
  try {
    const categories = await getAllCategories();
    if (categories.length != 0) {
      res.json(categories);
    } else {
      res.status(404).json({ error: "No categories found." });
    }
  } catch (error) {
    res.status(500).json({ error: "failed to fetch categories." });
  }
});

// Add or update product in cart
app.post("/carts/:userId/items", async (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      // Create a new cart if one does not exist
      cart = new Cart({
        userId,
        items: [{ productId, quantity }],
      });
    } else {
      // Check if the product is already in the cart
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        // Update quantity if product already exists
        existingItem.quantity += quantity;
      } else {
        // Add new item to the cart
        cart.items.push({ productId, quantity });
      }
    }

    const updatedCart = await cart.save();
    res.status(200).json(updatedCart);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update cart", details: error.message });
  }
});

// Increase quantity of a product in the cart
app.post("/carts/:userId/items/:productId/increase", async (req, res) => {
  const { userId, productId } = req.params;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );
    if (existingItem) {
      existingItem.quantity += 1;
      const updatedCart = await cart.save();
      res.status(200).json(updatedCart);
    } else {
      res.status(404).json({ error: "Product not found in cart" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to increase quantity", details: error.message });
  }
});

// Decrease quantity of a product in the cart
app.post("/carts/:userId/items/:productId/decrease", async (req, res) => {
  const { userId, productId } = req.params;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );
    if (existingItem) {
      if (existingItem.quantity > 1) {
        existingItem.quantity -= 1;
      } else {
        //remove item from the cart
        cart.items = cart.items.filter(
          (item) => item.productId.toString() !== productId
        );
      }

      const updatedCart = await cart.save();
      res.status(200).json(updatedCart);
    } else {
      res.status(404).json({ error: "Product not found in cart" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to increase quantity", details: error.message });
  }
});

//processing products to checkout and calculate total price
app.get("/carts/:userId/checkout", async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const totalPrice = cart.items.reduce((total, item) => {
      return total + item.productId.price * item.quantity;
    }, 0);

    res.status(200).json({ totalPrice });
  } catch (error) {
    res.status(500).json({
      error: "failed to calculate total price",
      details: error.message,
    });
  }
});

// move product to wishlist
app.post("/carts/:userId/items/:productId/wishlist", async (req, res) => {
  const { userId, productId } = req.params;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const cartItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (cartItemIndex === -1)
      return res.status(404).json({ error: "Product not found in cart" });

    // Remove the item from the cart
    const [cartItem] = cart.items.splice(cartItemIndex, 1);

    await cart.save();

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      // Create a new wishlist if one does not exist
      wishlist = new Wishlist({ userId, items: [{ productId }] });
    } else {
      // here checking if the product is already in the wishlist
      const existingItem = wishlist.items.find(
        (item) => item.productId.toString() === productId
      );
      if (!existingItem) {
        // Add the item to the wishlist
        wishlist.items.push({ productId });
      }
    }

    const updatedWishlist = await wishlist.save();

    res.status(200).json({ cart, wishlist: updatedWishlist });
  } catch (error) {
    res.status(500).json({
      error: "Failed to move product to wishlist",
      details: error.message,
    });
  }
});

app.delete("/carts/:userId/items/:productId", async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      console.error(`Cart not found for userId=${userId}`);
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.items = cart.items.filter((item) => {
      if (productId === "null") {
        return item.productId === null;
      }
      return item.productId && String(item.productId._id) !== productId;
    });

    // console.log('Cart items after update:', cart.items);
    await cart.save();
    // console.log(`Successfully removed item with productId=${productId} from cart for userId=${userId}`);
    res.status(200).json(cart);
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get cart by userId
app.get("/carts/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
    });

    if (cart) {
      // console.log('Populated Cart:', JSON.stringify(cart, null, 2));

      res.status(200).json(cart);
    } else {
      res.status(404).json({ error: "Cart not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve cart", details: error.message });
  }
});

//wishlist part started
//get wishlist
app.get("/wishlists/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
    });
    if (wishlist) {
      res.status(200).json(wishlist);
    } else {
      res.status(404).json({ error: "wishlist not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve wishlist", details: error.message });
  }
});

// Add a product to the wishlist directly
app.post("/wishlists/:userId/items", async (req, res) => {
  const { userId } = req.params;
  const { productId } = req.body;

  try {
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [{ productId }] });
    } else {
      const existingItem = wishlist.items.find(
        (item) => item.productId.toString() === productId
      );
      if (!existingItem) {
        wishlist.items.push({ productId });
      }
    }

    const updatedWishlist = await wishlist.save();
    res.status(200).json(updatedWishlist);
  } catch (error) {
    res.status(500).json({
      error: "Failed to add item to wishlist",
      details: error.message,
    });
  }
});

// Remove a product from the wishlist
app.delete("/wishlists/:userId/items/:productId", async (req, res) => {
  const { userId, productId } = req.params;

  try {
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) return res.status(404).json({ error: "Wishlist not found" });

    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId
    );
    const updatedWishlist = await wishlist.save();
    res.status(200).json(updatedWishlist);
  } catch (error) {
    res.status(500).json({
      error: "Failed to remove item from wishlist",
      details: error.message,
    });
  }
});

// Move an item from the wishlist to the cart
app.post(
  "/wishlists/:userId/items/:productId/move-to-cart",
  async (req, res) => {
    const { userId, productId } = req.params;

    try {
      // Find and remove the item from the wishlist
      let wishlist = await Wishlist.findOne({ userId });
      if (!wishlist)
        return res.status(404).json({ error: "Wishlist not found" });

      wishlist.items = wishlist.items.filter(
        (item) => item.productId.toString() !== productId
      );
      await wishlist.save();

      // Find or create the cart
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [{ productId, quantity: 1 }] });
      } else {
        const existingItem = cart.items.find(
          (item) => item.productId.toString() === productId
        );
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          cart.items.push({ productId, quantity: 1 });
        }
      }

      const updatedCart = await cart.save();
      res.status(200).json(updatedCart);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to move item to cart", details: error.message });
    }
  }
);

//to add data for user
app.post("/users", async (req, res) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create user", details: error.message });
  }
});

//update user data
app.put("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    });
    if (updatedUser) {
      res.status(200).json(updatedUser);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update user", details: error.message });
  }
});

//get user
app.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId)
      .populate({ path: "cart.items.productId", model: "Product" })
      .populate("addresses");

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: "user not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve user", details: error.message });
  }
});

//address
// Add new address
app.post("/users/:userId/addresses", async (req, res) => {
  const { userId } = req.params;
  const { addressLine1, addressLine2, city, state, postalCode, country } =
    req.body;

  try {
    const address = new Address({
      userId,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    });

    const savedAddress = await address.save();

    // Add address to user's addresses array
    await User.findByIdAndUpdate(userId, {
      $push: { addresses: savedAddress._id },
    });

    res.status(201).json(savedAddress);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to add address", details: error.message });
  }
});

// Get all addresses for a user
app.get("/users/:userId/addresses", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate("addresses");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user.addresses);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve addresses", details: error.message });
  }
});

// Updating an address
app.put("/addresses/:addressId", async (req, res) => {
  const { addressId } = req.params;
  const { addressLine1, addressLine2, city, state, postalCode, country } =
    req.body;

  try {
    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { addressLine1, addressLine2, city, state, postalCode, country },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.status(200).json(updatedAddress);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update address", details: error.message });
  }
});

// Deleting an address
app.delete("/addresses/:addressId", async (req, res) => {
  const { addressId } = req.params;

  try {
    const deletedAddress = await Address.findByIdAndDelete(addressId);
    if (!deletedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Remove address from user's addresses array
    await User.findByIdAndUpdate(deletedAddress.userId, {
      $pull: { addresses: addressId },
    });

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete address", details: error.message });
  }
});

//updating products
async function updateProduct(productId, dataToUpdate) {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      dataToUpdate,
      { new: true }
    );
    return updatedProduct;
  } catch (error) {
    console.log("error in updating book data.", error);
  }
}
app.post("/products/:productId", async (req, res) => {
  try {
    const updatedProduct = await updateProduct(req.params.productId, req.body);
    if (updatedProduct) {
      res.status(200).json({
        message: "Book updated successfully",
        updatedProduct: updatedProduct,
      });
    } else {
      res.status(404).json({ error: "Book does not exist." });
    }
  } catch (error) {
    res.status(500).json({ error: "failed to update book price." });
  }
});
//adding price
async function updatePrice(productId, dataToUpdate) {
  try {
    const updatedPrice = await Product.findByIdAndUpdate(
      productId,
      dataToUpdate,
      { new: true }
    );
    return updatedPrice;
  } catch (error) {
    console.log("error in updating book price.", error);
  }
}
app.post("/products/:productId/price", async (req, res) => {
  try {
    const updatedPrice = await updatePrice(req.params.productId, req.body);
    if (updatedPrice) {
      res.status(200).json({
        message: "Book updated successfully.",
        updatedPrice: updatedPrice,
      });
    } else {
      res.status(404).json({ error: "book does not exist" });
    }
  } catch (error) {
    res.status(500).json({ error: "failed to update book price." });
  }
});

// clearing cart after order confirms
app.delete("/carts/:userId/clear", async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    // Clear all items from the cart
    cart.items = [];
    await cart.save();

    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to clear cart", details: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, (req, res) => {
  console.log(`Server is running in port ${PORT}`);
});
