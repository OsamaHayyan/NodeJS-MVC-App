const mongoose = require("mongoose");

const { validationResult } = require("express-validator");

const Product = require("../models/product");
const { deleteFile } = require("../util/file");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  console.log(image);

  if (!image) {
    return res.status(400).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      errorMessage: "The file is not an image",
      product: {
        title: title,
        price: price,
        description: description,
      },
    });
  }

  //مسار الصورة اللي اترفعت وهنسجلها في الداتا بيز
  let imageUrl = image.path;
  //هنتأكد ان لو باقي بيانات الفورمة مش كاملة نحذف الصورة اللي اترفعت
  if (!title || !price || !description) {
    //ميثود انا عاملها لحذف الملفات اما نعطيها مسار الملف
    deleteFile(imageUrl);
    //وهنا نخلي قيمة المتغير اللي محفوظ فيه مسار الصورة غير معرف عشان ميتحفظش في الداتا بيز
    imageUrl = undefined;
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title: title,
        price: price,
        description: description,
      },
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });
  product
    .save()
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }

  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const UpdatedTitle = req.body.title;
  const image = req.file;
  const UpdatedPrice = req.body.price;
  const UpdatedDescription = req.body.description;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("admin/edit-product", {
      pageTitle: "Edite Product",
      path: "/admin/add-product",
      editing: true,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title: UpdatedTitle,
        price: UpdatedPrice,
        description: UpdatedDescription,
        _id: prodId,
      },
    });
  }

  //sending new info directly using update method as parametars
  return Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = UpdatedTitle;
      product.price = UpdatedPrice;
      product.description = UpdatedDescription;
      if (image) {
        deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save();
      // return Product.updateOne({ _id: prodId }, { title: UpdatedTitle, price: UpdatedPrice, description: UpdatedDescription })
    })
    .then(() => {
      res.redirect("/admin/products");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error("no product was found"));
      }
      deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      res.status(200).json({ message: "Success!" });
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed!" });
    });
};
