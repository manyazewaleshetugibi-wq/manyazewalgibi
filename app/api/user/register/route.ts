import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import type { IUser } from '@/models/customer'
import nodemailer from 'nodemailer'

// Gmail SMTP Configuration
const {
  GMAIL_EMAIL,
  GMAIL_PASSWORD,
  APP_NAME = 'Bio Host Restaurant'
} = process.env

// Create Gmail transporter
const createGmailTransporter = () => {
  if (!GMAIL_EMAIL || !GMAIL_PASSWORD) {
    throw new Error('Gmail credentials are not configured in .env file')
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_PASSWORD
    },
    // Optional: Add this to help with Gmail's security
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Generate welcome email HTML
const generateWelcomeEmail = (firstName: string, lastName: string) => {
  const currentYear = new Date().getFullYear()
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${APP_NAME}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background-color: #c49a6c;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                border: 1px solid #e0e0e0;
                border-top: none;
            }
            .welcome-message {
                font-size: 18px;
                color: #555;
                margin-bottom: 25px;
            }
            .cta-button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #c49a6c;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .cta-button:hover {
                background-color: #b38b5f;
            }
            .special-offer {
                background-color: #fff3e0;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #c49a6c;
            }
            .special-offer h3 {
                color: #c49a6c;
                margin-top: 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #888;
                font-size: 14px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                margin: 0 10px;
                color: #c49a6c;
                text-decoration: none;
            }
            hr {
                border: none;
                border-top: 1px solid #e0e0e0;
                margin: 25px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to ${APP_NAME}! 🎉</h1>
            </div>
            <div class="content">
                <div class="welcome-message">
                    <h2>Hello ${firstName} ${lastName},</h2>
                    <p>Thank you for registering with ${APP_NAME}! We're absolutely delighted to have you as part of our restaurant family.</p>
                </div>
                
                <p>Your account has been successfully created. You can now enjoy exclusive benefits:</p>
                
                <ul style="margin: 20px 0; padding-left: 20px;">
                    <li>✨ <strong>Quick reservations</strong> - Book your table in seconds</li>
                    <li>🎁 <strong>Special offers</strong> - Get exclusive deals and promotions</li>
                    <li>📱 <strong>Order history</strong> - Track your favorite dishes</li>
                    <li>🎂 <strong>Birthday specials</strong> - Celebrate with us and get free treats</li>
                </ul>
                
                <div class="special-offer">
                    <h3>🎁 Your Welcome Gift</h3>
                    <p>As a token of our appreciation, enjoy <strong>5% off</strong> on your next visit! Just show this email or mention your welcome offer when you visit us.</p>
                    <p style="font-size: 12px; color: #999;">*Valid for 30 days. Not combinable with other offers.</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">Browse Our Menu</a>
                </div>
                
                <hr>
                
                <h3>📍 Visit Us</h3>
                <p>We're located at:<br>
                bole behined selam city moll<br]<br>
                [City, State, ZIP]</p>
                
                <p><strong>Hours of Operation:</strong><br>
                Monday - Friday: 11:00 AM - 10:00 PM<br>
                Saturday - Sunday: 10:00 AM - 11:00 PM</p>
                
                <p><strong>Contact:</strong><br>
                📞 Phone: [Your Phone Number]<br>
                📧 Email: ${GMAIL_EMAIL}</p>
                
                <div class="social-links">
                    <p>Connect with us:</p>
                    <a href="#">Facebook</a> |
                    <a href="#">Instagram</a> |
                    <a href="#">Twitter</a>
                </div>
                
                <div class="footer">
                    <p>This email was sent to you because you registered at ${APP_NAME}.</p>
                    <p>If you didn't create this account, please contact us immediately.</p>
                    <p>&copy; ${currentYear} ${APP_NAME}. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `
}

// Generate plain text version
const generatePlainTextEmail = (firstName: string, lastName: string) => {
  return `
Welcome to ${APP_NAME}!

Hello ${firstName} ${lastName},

Thank you for registering with ${APP_NAME}! We're delighted to have you as part of our restaurant family.

Your account has been successfully created. You can now:
- Make quick reservations
- Get special offers and promotions
- Track your order history
- Receive birthday specials

🎁 YOUR WELCOME GIFT: Enjoy 5% off on your next visit! Just mention this offer when you dine with us.

Visit us at:
behined selam city moll

Hours:
Monday - Friday: 11:00 AM - 10:00 PM
Saturday - Sunday: 10:00 AM - 11:00 PM

Contact:
📞 Phone: 0904003377
📧 Email: ${GMAIL_EMAIL}

Connect with us on social media:
Facebook | Instagram | Twitter

This email was sent because you registered at ${APP_NAME}.
If you didn't create this account, please contact us immediately.

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      birthDate,
      gender,
      address,
      location,
      registrationSource = 'website',
      locationConsent = false
    } = body

    // Validate required fields
    if (!firstName || !lastName || !password || !birthDate || !address) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'First name, last name, password, birth date, and address are required' 
        },
        { status: 400 }
      )
    }

    // Validate at least one contact method
    if (!email && !phone) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Either email or phone number is required' 
        },
        { status: 400 }
      )
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()

    // Check if user exists by email or phone
    const usersCollection = db.collection('users')
    
    const existingUser = await usersCollection.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : [])
      ]
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User with this email or phone already exists' 
        },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user document
    const newUser: IUser = {
      _id: new ObjectId(),
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      password: hashedPassword,
      birthDate: new Date(birthDate),
      gender: gender || 'male',
      address,
      location: location || {
        coordinates: null,
        address: '',
        city: '',
        country: ''
      },
      role: 'user',
      registrationSource,
      locationConsent,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    }

    // Insert user into database
    const result = await usersCollection.insertOne(newUser)

    // Send welcome email if user provided email
    let emailSent = false
    let emailError = null
    
    if (email) {
      try {
        // Create Gmail transporter
        const transporter = createGmailTransporter()
        
        // Send email
        const mailOptions = {
          from: `"${APP_NAME}" <${GMAIL_EMAIL}>`,
          to: email,
          subject: `🎉 Welcome to ${APP_NAME}! We're excited to have you!`,
          html: generateWelcomeEmail(firstName, lastName),
          text: generatePlainTextEmail(firstName, lastName)
        }
        
        const info = await transporter.sendMail(mailOptions)
        console.log('Welcome email sent successfully:', info.messageId)
        emailSent = true
        
      } catch (error) {
        // Log email error but don't fail registration
        console.error('Failed to send welcome email:', error)
        emailError = error instanceof Error ? error.message : 'Unknown email error'
      }
    }

    // Remove password from response
    const { password: _, ...userResponse } = newUser

    return NextResponse.json(
      { 
        success: true, 
        message: 'User registered successfully',
        user: userResponse,
        userId: result.insertedId,
        emailSent: emailSent,
        ...(emailError && { emailError: emailError }) // Only include if there was an error
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}