const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Enable CORS
app.use(cors());

// Create a new Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Routes
app.use('/api/users', require('./routes/user'));

// Endpoint to create an order
app.post('/api/payment/order', async (req, res) => {
  const { amount, currency } = req.body;

  const options = {
    amount: amount * 1, // amount in smallest currency unit (paise for INR)
    currency: currency || 'INR',
    receipt: `receipt_${Math.floor(Math.random() * 10000)}`,
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    res.status(201).json(order); // Return the order object
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Unable to create order', error });
  }
});

// Endpoint to verify payment
app.post('/api/payment/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    // Successful verification
    res.status(200).json({ message: 'Payment verification successful', success: true });
  } else {
    // Verification failed
    res.status(400).json({ message: 'Invalid signature', success: false });
  }
});

// Connect to MongoDB and start the server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(error => console.log(error));
