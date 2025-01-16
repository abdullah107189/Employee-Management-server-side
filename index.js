require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = 4545 || process.env.PORT;

// middleware
app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fx40ttv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // set user
    app.post("/setUser", async (req, res) => {
      const user = req.body;
      const findEmail = await userCollection.findOne({
        "userInfo.email": user.userInfo.email,
      });
      if (findEmail) {
        return res
          .status(409)
          .send("Conflict: Image already exists in the collection");
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get all users
    app.get("/allUser", async (req, res) => {
      const verified = req.query.isVerify;
      if (verified) {
        return res.send(
          await userCollection.find({ isVerified: true }).toArray()
        );
      }
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // verified set up by HR
    app.patch("/verifyChange/:id", async (req, res) => {
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

    // employee work sheet
    app.post("/work-sheet", async (req, res) => {
      const sheet = req.body;
      const result = await workSheetCollection.insertOne(sheet);
      res.send(result);
    });

    app.get("/work-sheet/:email", async (req, res) => {
      const email = req.params.email;
      const result = await workSheetCollection
        .find({ email })
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/work-sheet", async (req, res) => {
      const result = await workSheetCollection.find().toArray();
      res.send(result);
    });

    // sheet delete
    app.delete("/work-sheet/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await workSheetCollection.deleteOne(query);
      res.send(result);
    });

    // sheet update
    app.patch("/work-sheet/update/:id", async (req, res) => {
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
    });

    // payment request
    app.post("/payRequest", async (req, res) => {
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

    // payment update with patch
    app.patch("/payment-update/:id", async (req, res) => {
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
    });

    // get payment request with aggregate
    app.get("/payRequest", async (req, res) => {
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

    // api for HR progress route
    app.get("/progress", async (req, res) => {
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
