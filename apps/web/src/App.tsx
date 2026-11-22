import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Placeholder } from './pages/Placeholder';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Placeholder title="Dashboard" blurb="What we are watching, what has new episodes, and what is coming soon will appear here." />} />
        <Route path="series" element={<Placeholder title="TV Series" blurb="Add your first series to start building the archive." />} />
        <Route path="movies" element={<Placeholder title="Movies" blurb="Add your first movie to start building the archive." />} />
        <Route path="wishlist" element={<Placeholder title="Wishlist" blurb="Series and movies you want to watch will gather here." />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Placeholder title="Lost in the dark" blurb="That page does not exist." />} />
      </Route>
    </Routes>
  );
}
