export interface FeedbackOption {
  value: string
  label: string
  description: string
  nextActivityRequired: boolean
  recommendedNextAction: string
  category: 'hot' | 'warm' | 'cold' | 'neutral'
  group: 'Positive Outcome' | 'Objection' | 'Follow-Up Required' | 'Contact Issue' | 'Negative Outcome'
}

export const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    value: 'Interested – Request Demo',
    label: 'Interested – Request Demo',
    description: 'Prospect wants to see AutoTrace in action.',
    nextActivityRequired: true,
    recommendedNextAction: 'Schedule a demo and capture date/time.',
    category: 'hot',
    group: 'Positive Outcome',
  },
  {
    value: 'Interested – Request Quotation',
    label: 'Interested – Request Quotation',
    description: 'Prospect wants pricing for their fleet.',
    nextActivityRequired: true,
    recommendedNextAction: 'Capture fleet size/requirements and prepare quotation.',
    category: 'hot',
    group: 'Positive Outcome',
  },
  {
    value: 'Already Have GPS',
    label: 'Already Have GPS',
    description: 'Prospect already uses GPS/tracking.',
    nextActivityRequired: true,
    recommendedNextAction: 'Ask what their system covers beyond basic location tracking.',
    category: 'warm',
    group: 'Objection',
  },
  {
    value: 'Happy With Current Provider',
    label: 'Happy With Current Provider',
    description: 'Prospect is satisfied with their existing solution.',
    nextActivityRequired: true,
    recommendedNextAction: 'Record provider/renewal timing and schedule future follow-up.',
    category: 'warm',
    group: 'Objection',
  },
  {
    value: 'Send Information by Email',
    label: 'Send Information by Email',
    description: 'Prospect wants information before discussing further.',
    nextActivityRequired: true,
    recommendedNextAction: 'Send AutoTrace overview and schedule a follow-up.',
    category: 'warm',
    group: 'Follow-Up Required',
  },
  {
    value: 'Too Expensive',
    label: 'Too Expensive',
    description: 'Prospect considers the solution cost too high.',
    nextActivityRequired: true,
    recommendedNextAction: 'Understand fleet size/current cost and assess ROI/value.',
    category: 'cold',
    group: 'Objection',
  },
  {
    value: 'No Current Requirement',
    label: 'No Current Requirement',
    description: 'Prospect currently sees no need for fleet tracking.',
    nextActivityRequired: true,
    recommendedNextAction: 'Record reason and schedule a future check-in.',
    category: 'cold',
    group: 'Negative Outcome',
  },
  {
    value: 'Need Management Approval',
    label: 'Need Management Approval',
    description: 'Prospect requires internal management approval.',
    nextActivityRequired: true,
    recommendedNextAction: 'Identify decision-maker and arrange a joint discussion/demo.',
    category: 'warm',
    group: 'Follow-Up Required',
  },
  {
    value: 'Call Back Later',
    label: 'Call Back Later',
    description: 'Prospect is unavailable or wants a later conversation.',
    nextActivityRequired: true,
    recommendedNextAction: 'Capture specific callback date/time.',
    category: 'warm',
    group: 'Follow-Up Required',
  },
  {
    value: 'Decision Maker Not Available',
    label: 'Decision Maker Not Available',
    description: 'Contact reached is not the decision-maker or cannot connect them.',
    nextActivityRequired: true,
    recommendedNextAction: 'Obtain decision-maker name/role and arrange callback.',
    category: 'neutral',
    group: 'Contact Issue',
  },
  {
    value: 'Wrong Contact',
    label: 'Wrong Contact',
    description: 'Contact is unrelated to fleet/transport decisions.',
    nextActivityRequired: true,
    recommendedNextAction: 'Ask for the correct Fleet/Transport/Operations contact.',
    category: 'neutral',
    group: 'Contact Issue',
  },
  {
    value: 'Not Interested',
    label: 'Not Interested',
    description: 'Prospect clearly declines further discussion.',
    nextActivityRequired: false,
    recommendedNextAction: 'Record reason if provided; close the opportunity.',
    category: 'cold',
    group: 'Negative Outcome',
  },
]

export interface InterestAreaOption {
  value: string
  label: string
  description: string
}

export const INTEREST_AREAS: InterestAreaOption[] = [
  { value: 'Fleet Tracking & Telematics', label: 'Fleet Tracking & Telematics', description: 'Real-time GPS tracking and live vehicle status' },
  { value: 'School Bus Safety & RFID', label: 'School Bus Safety & RFID', description: 'Student boarding logs, parent notifications, speed monitoring' },
  { value: 'Fuel Monitoring & Theft Prevention', label: 'Fuel Monitoring & Theft Prevention', description: 'Fuel level sensors, drainage alerts, consumption analytics' },
  { value: 'Cold Chain / Temperature Sensors', label: 'Cold Chain / Temperature Sensors', description: 'Real-time temperature logging for refrigerated transport' },
  { value: 'Driver Behavior & Safety Scoring', label: 'Driver Behavior & Safety Scoring', description: 'Harsh braking, speeding, idling, seatbelt alerts' },
  { value: 'Route Optimization & Dispatch', label: 'Route Optimization & Dispatch', description: 'Smart routing, delivery scheduling, geofencing' },
  { value: 'Vehicle Maintenance & Diagnostics', label: 'Vehicle Maintenance & Diagnostics', description: 'OBD-II engine alerts, service reminders, odometer tracking' },
  { value: 'General Inquiry / Full Suite', label: 'General Inquiry / Full Suite', description: 'Comprehensive enterprise fleet management package' },
]
