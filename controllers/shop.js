const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const stripe = require("stripe")(
  "sk_test_51If5jAGVsdNSiVAEPPB6wSY3gIzCO4rjzldXgrtk6SUBslVE4JCB5P4WzIUFZRIVBlfzchCshZofuzNRHaDKZEjU009QKD75KX"
);

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      console.log(`my name is osama ${req.user}`);
      return req.user.addToCart(product);
    })
    .then(() => {
      req.user.save();
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  console.log(prodId);
  req.user
    .deleteCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      let total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrders = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      console.log(user.cart.items);
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        products: products,
        user: {
          email: req.user.email,
          userId: req.user,
        },
      });
      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }

      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }

      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);
      const doc = new PDFDocument();

      //adding the created file to the path by making it streams as buffers using createWriteStream()
      doc.pipe(fs.createWriteStream(invoicePath));
      //sending the created file to the response to the client
      res.setHeader("Content-type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"'
      );
      doc.pipe(res);

      doc.fontSize(26).text("Invoice", {
        underline: true,
      });

      doc.text("---------------------");

      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        doc.text(
          prod.product.title +
            " - " +
            prod.quantity +
            " x " +
            "$" +
            prod.product.price
        );
      });

      doc.text("Total Price is $" + totalPrice);

      doc.end();
      // //New way of downloading small files // res.download(path, file) or res.download(path with file in it)
      // res.download(invoicePath, (err) => {
      //   if (err) {
      //     return next(err);
      //   }
      // });
    })
    .catch((err) => {
      next(err);
    });

  // other wat to upload big files by streaming it to the client chunk by chunk
  // This line opens the file as a readable stream
  //const readStream = fs.createReadStream(invoicePath);

  // // This will tell the browser that we are downloading a file
  // res.setHeader('Content-type', 'application/pdf');
  // res.setHeader('Content-Dispoition', 'attachment; filename=' + invoiceName);

  // // This will wait until we know the readable stream is actually valid before piping
  // readStream
  //   .on('open', function () {
  //     // This just pipes the read stream to the response object (which goes to the client)
  //     readStream.pipe(res);
  //   })
  //   .on('end', function () {
  //     readStream.unpipe(res);
  //     console.log('All the data in the file has been read');
  //   })
  //   .on('close', function (err) {
  //     console.log('Stream has been Closed');
  //     next(err)
  //   });

  //old way of downloading files for small files

  // fs.readFile(invoicePath, (err, data) => {
  //   if (err) {
  //     next(err);
  //   }
  //   res.setHeader('Content-type', 'application/pdf');
  //   res.setHeader('Content-Dispoition', 'attachment; filename=' + invoiceName);
  //   res.send(data);
  // })
};
