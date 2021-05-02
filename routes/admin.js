const express = require("express");
const { body, check } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body(
      "title",
      "title should be name with numbers only with at least 3 char length"
    )
      .isAlphanumeric()
      .isLength({ min: 3 })
      .trim(),
    body("price", "Price should be number").isFloat(),
    body("description", "description should be at least 5 char to max 500 char")
      .isLength({ min: 5, max: 500 })
      .trim(),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  [
    body(
      "title",
      "title should be name with numbers only with at least 3 char length"
    )
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body("price", "Price should be number").isFloat(),
    body("description", "description should be at least 5 char to max 500 char")
      .isLength({ min: 5, max: 500 })
      .trim(),
  ],
  isAuth,
  check("image", "please instert image").matches(/(.jpg|.png|.jpeg)/),
  adminController.postEditProduct
);

router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
