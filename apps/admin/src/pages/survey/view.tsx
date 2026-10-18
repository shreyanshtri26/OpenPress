import { useParams } from 'react-router-dom';
import SurveyPublicView from '../../components/surveys/SurveyPublicView';

export default function SurveyViewPage() {
  const { surveyId } = useParams<{ surveyId: string }>();

  if (!surveyId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Invalid survey link.
      </div>
    );
  }

  return <SurveyPublicView surveyId={surveyId} />;
}
