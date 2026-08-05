VEDÁTORSKÝ PODCAST PODLE TÉMAT

1. Nahrajte celý obsah složky na GitHub Pages nebo jiný HTTPS hosting.
2. Otevřete index.html přes webovou adresu.
3. Aplikace načte veřejný RSS kanál podcastu přes veřejný CORS proxy server.
4. Poslední úspěšně načtený katalog uloží do localStorage, takže jej lze později procházet i bez nového načtení.
5. Tematické třídění lze upravit přímo v index.html v objektu TOPICS.

Poznámka:
Třídění je založeno na názvu a oficiálním popisu epizody, nikoli na kompletním přepisu audia.
