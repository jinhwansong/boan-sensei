export function App() {
  const savedTheme = localStorage.getItem("theme");

  console.log("theme", savedTheme);

  return (
    <main>
      <a href="https://example.com" target="_blank">
        External docs
      </a>
    </main>
  );
}
