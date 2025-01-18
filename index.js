require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = 4545 || process.env.PORT;
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.user = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fx40ttv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("Employee_Management");
    const userCollection = db.collection("user");
    const workSheetCollection = db.collection("work_sheet");
    const payRequestCollection = db.collection("payment_request");

    // verify employee
    const verifyEmployee = async (req, res, next) => {
      const find = await userCollection.findOne({
        "userInfo.email": req.user.email,
      });
      const role = find.role;
      if (role !== "employee") {
        return res.status(403).send({ message: "Unauthorized access" });
      }
      next();
    };
    // verify HR
    const verifyHR = async (req, res, next) => {
      const find = await userCollection.findOne({
        "userInfo.email": req.user.email,
      });
      const role = find.role;
      if (role !== "hr") {
        return res.status(403).send({ message: "Unauthorized access" });
      }
      next();
    };
    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const find = await userCollection.findOne({
        "userInfo.email": req.user.email,
      });
      const role = find.role;
      if (role !== "admin") {
        return res.status(403).send({ message: "Unauthorized access" });
      }
      next();
    };

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };
    // jwt sign
    app.post("/jwt-sign", async (req, res) => {
      const userInfo = req.body;
      const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // jwt logout
    app.post("/jwt-logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // check role ✅
    app.get("/checkRole/:email", verifyToken, async (req, res) => {
      const ParamsEmail = req.params.email;
      if (ParamsEmail) {
        const filter = { "userInfo.email": ParamsEmail };
        const checkRole = await userCollection.findOne(filter);
        res.send(checkRole?.role);
      }
    });

    // set user
    app.post("/setUser", async (req, res) => {
      const user = req.body;
      const findEmail = await userCollection.findOne({
        "userInfo.email": user.userInfo.email,
      });
      if (findEmail) {
        return;
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get all users  ||verify||fired||
    app.get("/allUser", async (req, res) => {
      const verified = req.query.isVerify;
      const { isFiredEmail } = req.query;
      if (verified) {
        return res.send(
          await userCollection
            .find({ isVerified: true, role: { $in: ["employee", "hr"] } })
            .toArray()
        );
      }
      if (isFiredEmail) {
        const isMatch = await userCollection.findOne({
          "userInfo.email": isFiredEmail,
        });
        if (isMatch.isFired === true) {
          return res.status(409).send({ message: "You are fired 😷" });
        }
      }
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/details/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection
        .aggregate([
          {
            $match: filter,
          },
          {
            $lookup: {
              from: "payment_request",
              localField: "userInfo.email",
              foreignField: "employeeEmail",
              as: "paymentInfo",
            },
          },
          // get payment success true data
          {
            $project: {
              _id: 1,
              userInfo: 1,
              designation: 1,
              paymentInfo: {
                $filter: {
                  input: "$paymentInfo",
                  as: "payment",
                  cond: { $eq: ["$$payment.isPaymentSuccess", true] },
                },
              },
            },
          },

          {
            $project: {
              _id: 1,
              userInfo: 1,
              designation: 1,
              paymentInfo: {
                $map: {
                  input: "$paymentInfo",
                  as: "payment",
                  in: {
                    monthAndYear: "$$payment.monthAndYear",
                    salary: "$$payment.salary",
                  },
                },
              },
            },
          },
          {
            $addFields: {
              paymentInfo: {
                $sortArray: {
                  input: "$paymentInfo",
                  sortBy: { monthAndYear: 1 },
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              userInfo: 1,
              designation: 1,
              paymentInfo: 1,
            },
          },
        ])
        .toArray();

      res.send(result);
    });
    // set employee  work sheet ✅
    app.post("/work-sheet", verifyToken, verifyEmployee, async (req, res) => {
      const sheet = req.body;
      const result = await workSheetCollection.insertOne(sheet);
      res.send(result);
    });

    // get email match data ✅
    app.get(
      "/work-sheet/:email",
      verifyToken,
      verifyEmployee,
      async (req, res) => {
        const email = req.params.email;
        const result = await workSheetCollection
          .find({ email })
          .sort({ date: -1 })
          .toArray();
        res.send(result);
      }
    );

    // sheet delete ✅
    app.delete(
      "/work-sheet/:id",
      verifyToken,
      verifyEmployee,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await workSheetCollection.deleteOne(query);
        res.send(result);
      }
    );

    // sheet update ✅
    app.patch(
      "/work-sheet/update/:id",
      verifyToken,
      verifyEmployee,
      async (req, res) => {
        const { updateSheet } = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            work: updateSheet.work,
            hours: updateSheet.hours,
            date: updateSheet.date,
          },
        };
        const result = await workSheetCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // show payment history only own payment ✅
    app.get(
      "/payment/history/:email",

      async (req, res) => {
        const email = req.params.email;
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skip = (page - 1) * limit;
        const count = await payRequestCollection.countDocuments({
          employeeEmail: email,
          isPaymentSuccess: true,
        });
        console.log(count);
        const result = await payRequestCollection
          .aggregate([
            {
              $match: { employeeEmail: email, isPaymentSuccess: true },
            },
            {
              $sort: { paymentDate: -1 },
            },
            {
              $group: {
                _id: null,
                firstPayment: { $first: "$$ROOT" },
                allPayment: { $push: "$$ROOT" },
              },
            },
            {
              $project: {
                _id: 0,
                firstPayment: 1,
                allPayment: 1,
              },
            },
            {
              $unwind: "$allPayment",
            },
            {
              $sort: { "allPayment.paymentDate": 1 },
            },
            {
              $group: {
                _id: null,
                firstPayment: { $first: "$firstPayment" },
                allPayment: { $push: "$allPayment" },
              },
            },
            {
              $project: {
                _id: 0,
                firstPayment: 1,
                allPayment: { $slice: ["$allPayment", skip, limit] },
              },
            },
          ])
          .toArray();
        res.send({ result: result, count: count });
      }
    );

    //----------------------------------- hr ----------------------------------------

    // only employee get show this route only HR ✅
    app.get("/onlyEmployee", verifyToken, verifyHR, async (req, res) => {
      const result = await userCollection.find({ role: "employee" }).toArray();
      res.send(result);
    });

    // hr show all employee ✅
    app.get("/work-sheet", verifyToken, verifyHR, async (req, res) => {
      const result = await workSheetCollection.find().toArray();
      res.send(result);
    });

    // verified set and remove up by HR ✅
    app.patch("/verifyChange/:id", verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const findVerify = await userCollection.findOne(filter);
      let result = {};
      if (findVerify.isVerified === false) {
        result = await userCollection.updateOne(filter, {
          $set: { isVerified: true },
        });
      } else {
        result = await userCollection.updateOne(filter, {
          $set: {
            isVerified: false,
          },
        });
      }
      res.send(result);
    });

    // show all employee list and progress using dropdown - for HR progress route ✅
    app.get("/progress", verifyToken, verifyHR, async (req, res) => {
      const { filterName, filterDate } = req.query;
      let query = {};

      if (filterName === "all" && filterDate === "all") {
        query = {};
      } else if (filterName !== "all" && filterDate === "all") {
        query.name = filterName;
      } else if (filterName === "all" && filterDate !== "all") {
        query.monthAndYear = filterDate;
      } else {
        query.name = filterName;
        query.monthAndYear = filterDate;
      }
      const filterSheet = await workSheetCollection.find(query).toArray();
      res.send(filterSheet);
    });

    // payment request sent  ✅
    app.post("/payRequest", verifyToken, verifyHR, async (req, res) => {
      const reqestBody = req.body;
      const isAxist = await payRequestCollection.findOne({
        monthAndYear: reqestBody.monthAndYear,
        employeeEmail: reqestBody.employeeEmail,
      });
      if (isAxist) {
        return res
          .status(409)
          .send({ message: "This month/Year already sent to admin" });
      }
      const result = await payRequestCollection.insertOne(reqestBody);
      res.send(result);
    });
    // =========================== admin ====================

    // fire employee/HR ✅
    app.patch("/fire/:email", verifyToken, verifyAdmin, async (req, res) => {
      const { email } = req.params;
      const filter = { "userInfo.email": email };
      const updateDoc = {
        $set: {
          isFired: true,
        },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // hr -> employee || employee -> hr ✅
    app.patch(
      "/change/role/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { email } = req.params;
        const filter = { "userInfo.email": email };
        const roleChange = req.body.role;
        let role = {};
        if (roleChange === "hr") {
          role = { role: "employee" };
        }
        if (roleChange === "employee") {
          role = { role: "hr" };
        }
        const updateDoc = {
          $set: role,
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // payment update with patch ✅
    app.patch(
      "/payment-update/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { paymentDate } = req.query;
        const id = req.params.id;
        let transactionId = {};
        transactionId = require("crypto").randomBytes(5).toString("hex");
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            isPaymentSuccess: true,
            paymentDate: paymentDate,
            transactionId: transactionId,
          },
        };
        const options = { upsert: true };
        const result = await payRequestCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    // get payment request with aggregate ✅
    app.get("/payRequest", verifyToken, verifyAdmin, async (req, res) => {
      const result = await payRequestCollection
        .aggregate([
          {
            $lookup: {
              from: "user",
              localField: "employeeEmail",
              foreignField: "userInfo.email",
              as: "employeeInfo",
            },
          },
          {
            $unwind: "$employeeInfo",
          },
          {
            $match: {
              "employeeInfo.isVerified": true,
            },
          },
          {
            $project: {
              _id: 1,
              employeeName: 1,
              employeeEmail: 1,
              salary: 1,
              monthAndYear: 1,
              paymentDate: 1,
              isPaymentSuccess: 1,
              transactionId: 1,
              designation: 1,
              "employeeInfo.userInfo.photoUrl": 1,
              "employeeInfo.bankAccountNo": 1,
              "employeeInfo.designation": 1,
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    // update salary ✅
    app.patch(
      "/user/update/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const salary = req.body.salary;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            salary: salary,
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
