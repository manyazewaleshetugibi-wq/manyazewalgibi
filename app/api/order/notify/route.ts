import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import nodemailer from 'nodemailer'

// Gmail SMTP Configuration
const {
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
  APP_NAME = 'Bio Host Restaurant'
} = process.env

// Types
interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface DeliveryInfo {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  landmark?: string;
  deliveryInstructions?: string;
  specialRequirements?: string;
}

interface Order {
  _id: ObjectId;
  userId: string;
  orderNumber: string;
  deliveryInfo: DeliveryInfo;
  items: OrderItem[];
  status: string;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMethod: string;
  transactionId?: string;
  paymentScreenshotUrl?: string;
  isActive: boolean;
  delivery: boolean;
  inTable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED';

interface StatusConfig {
  icon: string;
  title: string;
  color: string;
  bgColor: string;
  message: string;
  steps: string[];
  additionalInfo: string;
}

// Create Gmail transporter
const createGmailTransporter = () => {
  if (!GMAIL_EMAIL || !GMAIL_PASSWORD) {
    throw new Error('Gmail credentials are not configured in .env file')
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Order status email templates
const getOrderStatusEmailHTML = (
  customerName: string,
  orderNumber: string,
  orderId: string,
  status: OrderStatus,
  orderDetails?: any
): string => {
  const currentYear = new Date().getFullYear()
  const orderDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const orderTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  // Status specific configurations
  const statusConfig: Record<OrderStatus, StatusConfig> = {
    PENDING: {
      icon: '⏳',
      title: 'Order Received!',
      color: '#ff9800',
      bgColor: '#fff3e0',
      message: 'We have received your order and it\'s awaiting confirmation.',
      steps: [
        'Order received 📝',
        'Awaiting confirmation ⏳',
        'Restaurant reviewing order 👨‍🍳',
        'Will confirm shortly ✨'
      ],
      additionalInfo: 'We\'ll notify you once your order is confirmed. This usually takes 2-3 minutes.'
    },
    CONFIRMED: {
      icon: '✅',
      title: 'Order Confirmed!',
      color: '#4caf50',
      bgColor: '#e8f5e8',
      message: 'Great news! Your order has been confirmed and our kitchen is preparing your delicious meal!',
      steps: [
        'Order confirmed ✅',
        'Payment verified 💰',
        'Kitchen preparing 👨‍🍳',
        'Quality check in progress ✨'
      ],
      additionalInfo: 'You\'ll receive another notification when your order is out for delivery.'
    },
    ON_THE_WAY: {
      icon: '🛵',
      title: 'Your Order is On The Way!',
      color: '#2196f3',
      bgColor: '#e3f2fd',
      message: 'Your delicious meal is out for delivery and will arrive soon!',
      steps: [
        'Order prepared ✅',
        'Packed with care 📦',
        'Assigned to delivery partner 🛵',
        'On the way to you 🚀'
      ],
      additionalInfo: 'Your delivery partner is on the way. Please keep your phone nearby.'
    },
    COMPLETED: {
      icon: '🎉',
      title: 'Order Delivered!',
      color: '#9c27b0',
      bgColor: '#f3e5f5',
      message: 'Your order has been successfully delivered! Thank you for choosing us.',
      steps: [
        'Order delivered ✅',
        'Payment completed 💰',
        'Thank you for choosing us! 🙏',
        'We hope you enjoy your meal! 🍽️'
      ],
      additionalInfo: 'We\'d love to hear about your experience. Please leave us a review!'
    },
    CANCELLED: {
      icon: '❌',
      title: 'Order Cancelled',
      color: '#f44336',
      bgColor: '#ffebee',
      message: 'Your order has been cancelled. We apologize for any inconvenience.',
      steps: [
        'Order cancellation requested 📝',
        'Cancellation confirmed ✅',
        'Payment will be refunded 💰',
        'Refund processed within 5-7 days ⏱️'
      ],
      additionalInfo: 'If you didn\'t request this cancellation or need assistance, please contact our support team.'
    }
  }

  const config = statusConfig[status]

  // Generate order items HTML
  const orderItemsHTML = orderDetails?.items ? `
    <div style="margin: 25px 0;">
      <h3 style="color: #333; margin-bottom: 15px;">📋 Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${orderDetails.items.map((item: OrderItem) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.itemName}</td>
              <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
              <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">ETB ${item.unitPrice.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
            <td style="padding: 10px; text-align: right;">ETB ${orderDetails.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Delivery Fee:</td>
            <td style="padding: 10px; text-align: right;">ETB ${orderDetails.deliveryFee.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Tax:</td>
            <td style="padding: 10px; text-align: right;">ETB ${orderDetails.tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold; color: ${config.color};">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: ${config.color};">ETB ${orderDetails.finalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  ` : ''

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order ${status} - ${APP_NAME}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 5px 25px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 10px 0 0;
                font-size: 28px;
                font-weight: 600;
            }
            .header .order-icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            .content {
                padding: 30px;
            }
            .status-badge {
                background-color: ${config.bgColor};
                border-left: 4px solid ${config.color};
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
            }
            .status-badge h2 {
                color: ${config.color};
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 22px;
            }
            .order-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 15px;
            }
            .info-item {
                padding: 10px;
                background-color: white;
                border-radius: 6px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .info-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
            }
            .info-value {
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
            .delivery-details {
                background-color: #e3f2fd;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #2196f3;
            }
            .progress-steps {
                margin: 30px 0;
                position: relative;
            }
            .step {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 8px;
                transition: transform 0.2s;
            }
            .step:hover {
                transform: translateX(5px);
            }
            .step-icon {
                width: 36px;
                height: 36px;
                background-color: ${config.color};
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
                font-size: 18px;
            }
            .step-text {
                flex: 1;
                font-size: 15px;
                color: #555;
            }
            .cta-button {
                display: inline-block;
                padding: 14px 30px;
                background-color: ${config.color};
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                transition: background-color 0.3s;
                border: none;
                cursor: pointer;
            }
            .cta-button:hover {
                background-color: ${config.color}dd;
            }
            .contact-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-top: 25px;
                border: 1px solid #e9ecef;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 25px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }
            hr {
                border: none;
                border-top: 1px solid #e9ecef;
                margin: 25px 0;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 10px;
                }
                .content {
                    padding: 20px;
                }
                .info-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="order-icon">${config.icon}</div>
                <h1>${config.title}</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Order #${orderNumber}</p>
            </div>
            
            <div class="content">
                <div class="status-badge">
                    <h2>Hello ${customerName},</h2>
                    <p style="margin-bottom: 0; font-size: 16px;">${config.message}</p>
                </div>

                <div class="order-info">
                    <h3 style="margin-top: 0; color: #333;">📅 Order Timeline</h3>
                    <div style="display: flex; justify-content: space-between; color: #666;">
                        <span>Order placed: ${orderDate}</span>
                        <span>Time: ${orderTime}</span>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Order Number</div>
                            <div class="info-value">${orderNumber}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Payment Method</div>
                            <div class="info-value">${orderDetails?.paymentMethod || 'ONLINE'}</div>
                        </div>
                        ${orderDetails?.transactionId ? `
                            <div class="info-item">
                                <div class="info-label">Transaction ID</div>
                                <div class="info-value">${orderDetails.transactionId}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${orderDetails?.deliveryInfo ? `
                    <div class="delivery-details">
                        <h3 style="margin-top: 0; color: #2196f3;">🚚 Delivery Details</h3>
                        <p><strong>Address:</strong> ${orderDetails.deliveryInfo.address}</p>
                        <p><strong>City:</strong> ${orderDetails.deliveryInfo.city}</p>
                        <p><strong>Phone:</strong> ${orderDetails.deliveryInfo.phoneNumber}</p>
                        ${orderDetails.deliveryInfo.landmark ? `<p><strong>Landmark:</strong> ${orderDetails.deliveryInfo.landmark}</p>` : ''}
                        ${orderDetails.deliveryInfo.deliveryInstructions ? `<p><strong>Instructions:</strong> ${orderDetails.deliveryInfo.deliveryInstructions}</p>` : ''}
                    </div>
                ` : ''}

                ${orderItemsHTML}

                <div class="progress-steps">
                    <h3 style="color: #333; margin-bottom: 15px;">📊 Order Progress</h3>
                    ${config.steps.map((step: string) => `
                        <div class="step">
                            <div class="step-icon">✓</div>
                            <div class="step-text">${step}</div>
                        </div>
                    `).join('')}
                </div>

                <div style="text-align: center;">
                    <a href="https://www.manyazewaleshetugibi.com/orders/${orderId}" class="cta-button">
                        Track Your Order
                    </a>
                </div>

                ${config.additionalInfo ? `
                    <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
                        <p style="margin: 0; color: #666;">💡 ${config.additionalInfo}</p>
                    </div>
                ` : ''}

                <div class="contact-info">
                    <h4 style="margin-top: 0;">📞 Need Help?</h4>
                    <p style="margin: 5px 0;">
                        <strong>Phone:</strong> 0904003377<br>
                        <strong>Email:</strong> ${GMAIL_EMAIL}<br>
                        <strong>Hours:</strong> Mon-Sun: 10:00 AM - 11:00 PM
                    </p>
                </div>

                <hr>

                <div class="footer">
                    <p>
                        ${APP_NAME}<br>
                        Bole behind Selam City Mall, Addis Ababa, Ethiopia
                    </p>
                    <p style="font-size: 12px; color: #999;">
                        This email was sent regarding your order at ${APP_NAME}.<br>
                        If you have any questions, please contact our support team.
                    </p>
                    <p style="font-size: 12px; color: #999;">
                        &copy; ${currentYear} ${APP_NAME}. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `
}

// Generate plain text version
const getOrderStatusPlainText = (
  customerName: string,
  orderNumber: string,
  status: OrderStatus,
  orderDetails?: any
): string => {
  const statusMessages: Record<OrderStatus, string> = {
    PENDING: `ORDER RECEIVED - Your order #${orderNumber} has been received and is awaiting confirmation.`,
    CONFIRMED: `ORDER CONFIRMED - Your order #${orderNumber} has been confirmed and is being prepared.`,
    ON_THE_WAY: `ON THE WAY - Your order #${orderNumber} is out for delivery!`,
    COMPLETED: `ORDER DELIVERED - Your order #${orderNumber} has been delivered. Thank you for choosing us!`,
    CANCELLED: `ORDER CANCELLED - Your order #${orderNumber} has been cancelled.`
  }

  return `
${APP_NAME} - Order Update

${statusMessages[status]}

Hello ${customerName},

Order Number: #${orderNumber}
Date: ${new Date().toLocaleDateString()}
Status: ${status}

${orderDetails?.deliveryInfo ? `
Delivery Address: ${orderDetails.deliveryInfo.address}
Phone: ${orderDetails.deliveryInfo.phoneNumber}
` : ''}

Total Amount: ETB ${orderDetails?.finalAmount?.toFixed(2) || '0.00'}

For order tracking and details, visit:
https://www.manyazewaleshetugibi.com/orders/${orderDetails?._id}

Need assistance?
Phone: 0904003377
Email: ${GMAIL_EMAIL}

Thank you for choosing ${APP_NAME}!

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `
}

// API endpoint to send order status notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      orderId,
      status, // 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED'
      updatedBy // Optional: who updated the status
    } = body

    // Validate required fields
    if (!orderId || !status) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Order ID and status are required' 
        },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid status. Must be one of: PENDING, CONFIRMED, ON_THE_WAY, COMPLETED, CANCELLED' 
        },
        { status: 400 }
      )
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()
    
    // Get the order from database
    const ordersCollection = db.collection('orders')
    const order = await ordersCollection.findOne({ 
      _id: new ObjectId(orderId),
      delivery: true, // Only delivery orders
      isActive: true // Only active orders
    }) as Order | null
    
    if (!order) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Order not found or is not a delivery order' 
        },
        { status: 404 }
      )
    }

    // Check if customer has email
    if (!order.deliveryInfo?.email) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Customer email not found for this order' 
        },
        { status: 400 }
      )
    }

    // Send email notification
    let emailSent = false
    let emailError: string | null = null

    try {
      const transporter = createGmailTransporter()
      
      const mailOptions = {
        from: `"${APP_NAME} Orders" <${GMAIL_EMAIL}>`,
        to: order.deliveryInfo.email,
        subject: `🍽️ Order ${status} - #${order.orderNumber} - ${APP_NAME}`,
        html: getOrderStatusEmailHTML(
          order.deliveryInfo.fullName, 
          order.orderNumber, 
          order._id.toString(), 
          status, 
          order
        ),
        text: getOrderStatusPlainText(
          order.deliveryInfo.fullName, 
          order.orderNumber, 
          status, 
          order
        )
      }
      
      const info = await transporter.sendMail(mailOptions)
      console.log(`Order ${status} email sent successfully to ${order.deliveryInfo.email}:`, info.messageId)
      emailSent = true

      // Update order with notification status
      await ordersCollection.updateOne(
        { _id: order._id },
        {
          $push: {
            notifications: {
              type: 'email',
              status: status,
              sentAt: new Date(),
              messageId: info.messageId,
              sentTo: order.deliveryInfo.email
            }
          },
          $set: { 
            updatedAt: new Date(),
            ...(updatedBy && { 
              updatedBy: {
                ...updatedBy,
                updatedAt: new Date()
              }
            })
          }
        }
      )

    } catch (error) {
      console.error('Failed to send order status email:', error)
      emailError = error instanceof Error ? error.message : 'Unknown email error'
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to send email notification',
          error: emailError
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `Order ${status} notification sent successfully to ${order.deliveryInfo.email}`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerEmail: order.deliveryInfo.email,
          customerName: order.deliveryInfo.fullName,
          status,
          emailSent,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Order notification error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check delivery orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    const client = await clientPromise
    const db = client.db()
    
    const query: any = { 
      delivery: true, // Only delivery orders
      isActive: true 
    }
    
    if (status) {
      query.status = status
    }

    const ordersCollection = db.collection('orders')
    const orders = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await ordersCollection.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching delivery orders:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
