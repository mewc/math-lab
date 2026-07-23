import SearchHome from "@/components/SearchHome";
import NewsFeed from "@/components/NewsFeed";

export default function Page() {
  return (
    <div className="home-shell">
      <SearchHome feed={<NewsFeed limit={6} />} />
    </div>
  );
}
