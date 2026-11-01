import { Badge } from './ui'
import { STATUS_LABEL } from '../lib/actions'

const C = { submitted: 'sky', acknowledged: 'purple', in_progress: 'amber', resolved: 'green', closed: 'gray' }
export const ComplaintStatus = ({ status }) => <Badge color={C[status]} dot>{STATUS_LABEL[status]}</Badge>

const P = { urgent: 'red', high: 'amber', medium: 'blue', low: 'gray' }
export const PriorityBadge = ({ p }) => <Badge color={P[p] || 'gray'}>{p}</Badge>
