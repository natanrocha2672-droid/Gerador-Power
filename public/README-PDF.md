# PDF completo do curso

Coloque aqui o arquivo completo do curso com o nome exato:

```txt
curso-completo.pdf
```

Quando esse arquivo existir em `public/curso-completo.pdf`, o build da Vercel executará:

```bash
npm run extract:course
```

Esse comando extrai o texto do PDF e gera automaticamente:

```txt
data/curso-extraido.json
```

O backend prioriza `data/curso-extraido.json` como fonte principal do curso. Os arquivos antigos em chunks/base64 ficam apenas como fallback.
