import { Routes, Route } from 'react-router-dom';
import TabNavigation from './components/TabNavigation';
import UploadPage from './pages/UploadPage';
import ReviewThemes from './pages/ReviewThemes';
import ResultsPage from './pages/ResultsPage';
import ClusterExistingCodes from './pages/ClusterCodes';
import DeductiveApproach from './pages/DeductiveApproach';
import HomePage from './pages/HomePage';
function App() {
  return (
    <>
      
      <TabNavigation /> {/* shows the nav bar with tab links */}
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/submission/:public_id/themes" element={<ReviewThemes />} />
        <Route path="/results/:public_id" element={<ResultsPage />} />
        <Route path="/cluster-existing" element={<ClusterExistingCodes />} />
        <Route path="/tbd" element={<DeductiveApproach />} />




 
      </Routes>
      
    </>
  );
}

export default App;
