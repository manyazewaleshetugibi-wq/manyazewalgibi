
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

// Generate referral code for new user
const generateReferralCode = (firstName: string, lastName: string, userId: string) => {
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  const idPart = userId.substring(0, 6).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${initials}-${idPart}-${random}`
}

// Generate welcome email HTML (keeping your existing function)
const generateWelcomeEmail = (firstName: string, lastName: string, referralCode: string) => {
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
            .referral-box {
                background-color: #e8f5e9;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #4caf50;
                text-align: center;
            }
            .referral-code {
                font-size: 24px;
                font-weight: bold;
                color: #2e7d32;
                letter-spacing: 2px;
                padding: 10px;
                background: white;
                border-radius: 5px;
                display: inline-block;
                margin: 10px 0;
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
            .special-offer {
                background-color: #fff3e0;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #c49a6c;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #888;
                font-size: 14px;
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
                
                <div class="referral-box">
                    <h3>🎁 Your Personal Referral Code</h3>
                    <p>Share this code with friends and family to earn bonus points!</p>
                    <div class="referral-code">${referralCode}</div>
                    <p style="font-size: 14px; margin-top: 10px;">
                        Share this code during registration to earn 10 points per referral!
                    </p>
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
                    <a href="https://www.manyazewaleshetugibi.com" class="cta-button">Browse Our Menu</a>
                </div>
                
                <hr>
                
                <h3>📍 Visit Us</h3>
                <p>We're located at:<br>
                Bole behind Selam City Mall<br>
                Addis Ababa, Ethiopia</p>
                
                <p><strong>Hours of Operation:</strong><br>
                Monday - Friday: 11:00 AM - 10:00 PM<br>
                Saturday - Sunday: 10:00 AM - 11:00 PM</p>
                
                <p><strong>Contact:</strong><br>
                📞 Phone: 0904003377<br>
                📧 Email: ${GMAIL_EMAIL}</p>
                
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
const generatePlainTextEmail = (firstName: string, lastName: string, referralCode: string) => {
  return `
Welcome to ${APP_NAME}!

Hello ${firstName} ${lastName},

Thank you for registering with ${APP_NAME}! We're delighted to have you as part of our restaurant family.

🎁 YOUR PERSONAL REFERRAL CODE: ${referralCode}

Share this code with friends and family to earn 10 points per referral!

Your account has been successfully created. You can now:
- Make quick reservations
- Get special offers and promotions
- Track your order history
- Receive birthday specials

🎁 YOUR WELCOME GIFT: ሰው ደስ ይለናል — your happiness means everything to us 😊 Enjoy a special treat through our service on your next visit.

Visit us at:
Bole behind Selam City Mall
Addis Ababa, Ethiopia

Hours:
Monday - Friday: 11:00 AM - 10:00 PM
Saturday - Sunday: 10:00 AM - 11:00 PM

Contact:
📞 Phone: 0904003377
📧 Email: ${GMAIL_EMAIL}

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
      inviterCode, // Added inviterCode
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

    // Validate inviter code if provided
    let inviterId = null
    if (inviterCode) {
      const inviter = await usersCollection.findOne({
        $or: [
          { referralCode: inviterCode },
          { 'referralInfo.code': inviterCode }
        ]
      })

      if (!inviter) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Invalid referral code' 
          },
          { status: 400 }
        )
      }

      // Prevent self-referral
      if (inviter.email === email || inviter.phone === phone) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'You cannot use your own referral code' 
          },
          { status: 400 }
        )
      }

      inviterId = inviter._id
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate unique referral code for new user
    const newUserId = new ObjectId()
    const referralCode = generateReferralCode(firstName, lastName, newUserId.toString())

    // Create new user document with referral info
    const newUser: IUser & { 
      referralCode: string,
      referredBy?: ObjectId,
      referralInfo?: {
        code: string,
        referredUsers: ObjectId[],
        totalReferrals: number,
        pointsEarned: number
      }
    } = {
      _id: newUserId,
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
      referralCode, // Store user's own referral code
      ...(inviterId && { referredBy: inviterId }), // Store who referred them
      referralInfo: {
        code: referralCode,
        referredUsers: [],
        totalReferrals: 0,
        pointsEarned: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    }

    // Insert user into database
    const result = await usersCollection.insertOne(newUser)

    // If user was referred, update the referrer's record
    if (inviterId) {
      await usersCollection.updateOne(
        { _id: inviterId },
        {
          $push: { 
            'referralInfo.referredUsers': newUserId 
          },
          $inc: {
            'referralInfo.totalReferrals': 1,
            'referralInfo.pointsEarned': 10 // Award 10 points for referral
          },
          $set: { updatedAt: new Date() }
        }
      )

      // Also create a referral record in a separate collection if needed
      const referralsCollection = db.collection('referrals')
      await referralsCollection.insertOne({
        _id: new ObjectId(),
        referrerId: inviterId,
        referredId: newUserId,
        referredEmail: email,
        referredName: `${firstName} ${lastName}`,
        status: 'completed',
        pointsAwarded: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    // Send welcome email if user provided email
    let emailSent = false
    let emailError = null
    
    if (email) {
      try {
        const transporter = createGmailTransporter()
        
        const mailOptions = {
          from: `"${APP_NAME}" <${GMAIL_EMAIL}>`,
          to: email,
          subject: `🎉 Welcome to ${APP_NAME}! Here's your referral code: ${referralCode}`,
          html: generateWelcomeEmail(firstName, lastName, referralCode),
          text: generatePlainTextEmail(firstName, lastName, referralCode)
        }
        
        const info = await transporter.sendMail(mailOptions)
        console.log('Welcome email sent successfully:', info.messageId)
        emailSent = true
        
      } catch (error) {
        console.error('Failed to send welcome email:', error)
        emailError = error instanceof Error ? error.message : 'Unknown email error'
      }
    }

    // Remove password from response
    const { password: _, ...userResponse } = newUser

    return NextResponse.json(
      { 
        success: true, 
        message: inviterId 
          ? 'User registered successfully with referral' 
          : 'User registered successfully',
        user: userResponse,
        userId: result.insertedId,
        referralCode, // Return the generated referral code
        referredBy: inviterId ? true : false,
        emailSent: emailSent,
        ...(emailError && { emailError: emailError })
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
