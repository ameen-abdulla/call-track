export interface FeedbackOption {
  value: string
  label: string
  description: string
  nextActivityRequired: boolean
  recommendedNextAction: string
  category: 'hot' | 'warm' | 'cold' | 'neutral'
}

export const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    value: 'Interested – Request Demo',
    label: 'Interested – Request Demo',
    description: 'Prospect wants to see AutoTrace in action.',
    nextActivityRequired: true,
    recommendedNextAction: 'Schedule a demo and capture date/time.',
    category: 'hot',
  },
  {
    value: 'Interested – Request Quotation',
    label: 'Interested – Request Quotation',
    description: 'Prospect wants pricing for their fleet.',
    nextActivityRequired: true,
    recommendedNextAction: 'Capture fleet size/requirements and prepare quotation.',
    category: 'hot',
  },
  {
    value: 'Already Have GPS',
    label: 'Already Have GPS',
    description: 'Prospect already uses GPS/tracking.',
    nextActivityRequired: true,
    recommendedNextAction: 'Ask what their system covers beyond basic location tracking.',
    category: 'warm',
  },
  {
    value: 'Happy With Current Provider',
    label: 'Happy With Current Provider',
    description: 'Prospect is satisfied with their existing solution.',
    nextActivityRequired: true,
    recommendedNextAction: 'Record provider/renewal timing and schedule future follow-up.',
    category: 'warm',
  },
  {
    value: 'Send Information by Email',
    label: 'Send Information by Email',
    description: 'Prospect wants information before discussing further.',
    nextActivityRequired: true,
    recommendedNextAction: 'Send AutoTrace overview and schedule a follow-up.',
    category: 'warm',
  },
  {
    value: 'Too Expensive',
    label: 'Too Expensive',
    description: 'Prospect considers the solution cost too high.',
    nextActivityRequired: true,
    recommendedNextAction: 'Understand fleet size/current cost and assess ROI/value.',
    category: 'cold',
  },
  {
    value: 'No Current Requirement',
    label: 'No Current Requirement',
    description: 'Prospect currently sees no need for fleet tracking.',
    nextActivityRequired: true,
    recommendedNextAction: 'Record reason and schedule a future check-in.',
    category: 'cold',
  },
  {
    value: 'Need Management Approval',
    label: 'Need Management Approval',
    description: 'Prospect requires internal management approval.',
    nextActivityRequired: true,
    recommendedNextAction: 'Identify decision-maker and arrange a joint discussion/demo.',
    category: 'warm',
  },
  {
    value: 'Call Back Later',
    label: 'Call Back Later',
    description: 'Prospect is unavailable or wants a later conversation.',
    nextActivityRequired: true,
    recommendedNextAction: 'Capture specific callback date/time.',
    category: 'warm',
  },
  {
    value: 'Decision Maker Not Available',
    label: 'Decision Maker Not Available',
    description: 'Contact reached is not the decision-maker or cannot connect them.',
    nextActivityRequired: true,
    recommendedNextAction: 'Obtain decision-maker name/role and arrange callback.',
    category: 'neutral',
  },
  {
    value: 'Wrong Contact',
    label: 'Wrong Contact',
    description: 'Contact is unrelated to fleet/transport decisions.',
    nextActivityRequired: true,
    recommendedNextAction: 'Ask for the correct Fleet/Transport/Operations contact.',
    category: 'neutral',
  },
  {
    value: 'Not Interested',
    label: 'Not Interested',
    description: 'Prospect clearly declines further discussion.',
    nextActivityRequired: false,
    recommendedNextAction: 'Record reason if provided; close the opportunity.',
    category: 'cold',
  },
]
