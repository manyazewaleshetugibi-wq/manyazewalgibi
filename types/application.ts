export interface BaseApplication {
  _id: string
  fullName: string
  email: string
  phone: string
  address: string
  gender: 'male' | 'female' | 'other'
  language: string
  createdAt: string
  updatedAt: string
}

export interface PodcastApplication extends BaseApplication {
  videoLink: string
  audioLink?: string
}

export interface EntenfisApplication extends BaseApplication {
  dateOfBirth: string
  occupation: string
  guestBio: string
  expertise: string
  achievements: string
  socialMediaLinks: string
  programTopic: string
  programDate: string
  programTime?: string
  interviewLanguage: string
  specialRequirements: string
  introductionVideo: string
}

export type Application = PodcastApplication | EntenfisApplication

export interface ApplicationsResponse {
  success: boolean
  data: Application[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApplicationResponse {
  success: boolean
  data: Application
}