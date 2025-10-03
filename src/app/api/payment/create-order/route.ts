
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import shortid from 'shortid';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const payment_capture = 1;
    const amountInPaise = amount * 100; // Razorpay expects amount in the smallest currency unit
    const currency = 'INR';

    const options = {
      amount: amountInPaise,
      currency,
      receipt: shortid.generate(),
      payment_capture,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);

  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
