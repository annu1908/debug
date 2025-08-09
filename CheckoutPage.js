import React, { useState, useEffect } from 'react';
import './CheckoutPage.css';

import { useNavigate } from 'react-router-dom';
import API from '../api';

const CheckoutPage = ({ cartItems, setCartItems }) => {
  const [showMessage, setShowMessage] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', address: '' });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const deliveryCharge = 50;
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const total = subtotal + deliveryCharge;

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // Autofill user info if available
      setFormData((prev) => ({
        ...prev,
        name: parsedUser.name || '',
        email: parsedUser.email || '',
      }));
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePayment = async () => {
    if (!user) {
      alert("⚠️ Please login to proceed with the order.");
      navigate("/login");
      return;
    }

    const amount = total;

    try {
      const res = await API.get('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const orderData = await res.json();

      const options = {
        key: 'rzp_test_soj7DcRXrQxl9G',
        amount: orderData.amount,
        currency: 'INR',
        name: 'Dreamscape Creation',
        description: 'Order Payment',
        order_id: orderData.id,
        handler: async function (response) {
          const orderDetails = {
            customerName: formData.name,
            customerEmail: formData.email,
            deliveryAddress: formData.address,
            items: cartItems,
            subtotal,
            deliveryCharge,
            total,
            userId: user._id, // include logged-in user id
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          };

          try {
            const saveRes = await API.post('/api/orders', orderDetails);
            setCartItems([]);
            localStorage.removeItem('cartItems');
            navigate('/ThankYou', { state: { orderId: saveRes.data.orderId } });
          } catch (err) {
            alert('✅ Payment succeeded, but saving order failed.');
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: '9999999999',
        },
        theme: { color: '#212135' },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (err) {
      console.error('Payment failed:', err);
      alert('❌ Payment could not be processed.');
    }
  };

  return (
    <div className="checkout-container">
      <h2>Checkout</h2>

      <div className="order-summary">
        <h3>Order Summary</h3>
        {cartItems.map((item) => (
          <div key={item._id} className="checkout-item">
            <p>{item.title} x {item.quantity}</p>
            <p>₹{item.price * item.quantity}</p>
          </div>
        ))}
        <p>Subtotal: ₹{subtotal}</p>
        <p>Delivery Charge: ₹{deliveryCharge}</p>
        <h4>Total: ₹{total}</h4>
      </div>

      {showMessage && (
        <div className='success-message'>
          <p>Order Placed Successfully!</p>
        </div>
      )}

      <form className="checkout-form" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <textarea
          name="address"
          placeholder="Delivery Address"
          value={formData.address}
          onChange={handleInputChange}
          required
        ></textarea>

        <button type="button"  onClick={handlePayment}>
          Proceed to Payment
        </button>
      </form>
    </div>
  );
};

export default CheckoutPage;