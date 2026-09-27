import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <EmptyState title="Page not found" icon="alert">
      <Link to="/" className="btn btn-primary">
        Go to dashboard
      </Link>
    </EmptyState>
  );
}
