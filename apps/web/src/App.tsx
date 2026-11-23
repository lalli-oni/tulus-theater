import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Library } from './components/Library';
import { Placeholder } from './pages/Placeholder';
import { Wishlist } from './pages/Wishlist';
import { Unknowns } from './pages/Unknowns';
import { Settings } from './pages/Settings';
import { Gallery } from './pages/Gallery';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Placeholder eyebrow="The archive" title="Dashboard" blurb="What we are watching, what has new episodes, and what is coming soon will appear here." />} />
        <Route path="series" element={<Library kind="tv" />} />
        <Route path="movies" element={<Library kind="movie" />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="settings" element={<Settings />} />
        <Route path="unknowns" element={<Unknowns />} />
        <Route path="design" element={<Gallery />} />
        <Route path="*" element={<Placeholder title="Lost in the dark" heading="That page does not exist" blurb="Use the navigation to find your way back." />} />
      </Route>
    </Routes>
  );
}
