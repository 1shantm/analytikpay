# 🧾 AnalytikPay

Serviço para processar e analisar boletos bancários utilizando o **Google Vision OCR** e o **Google Cloud Storage**.  
O projeto realiza o **download, leitura e extração automática de informações** como linha digitável, valor, vencimento e CNPJ.

---

## 🚀 Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Axios](https://axios-http.com/)
- [Google Cloud Vision API](https://cloud.google.com/vision)
- [Google Cloud Storage](https://cloud.google.com/storage)
- [File-Type](https://www.npmjs.com/package/file-type)
- [Dotenv](https://www.npmjs.com/package/dotenv)

---

## ⚙️ Funcionalidades

- 📥 **Download de boletos** a partir de uma URL.  
- 🧠 **Leitura de texto (OCR)** via Google Vision.  
- ☁️ **Upload automático** dos arquivos no Google Cloud Storage.  
- 🧾 **Extração de informações** do boleto:
  - Linha digitável  
  - Valor  
  - Data de vencimento  
  - CNPJ do emissor  

---

## 🏗️ Estrutura do Projeto

AnalytikPay/
├── src/
│ ├── helpers/ # Funções utilitárias (OCR, download, upload)
│ └── routes/ # Lógica específica de clientes
├── .env.development # Variáveis de ambiente
├── package.json
├── server.js # Servidor Express
└── README.md

---

## ⚡ Como Executar Localmente

### 
```bash
1️⃣ Clonar o repositório
git clone https://github.com/1shantm/analytikpay.git
cd analytikpay
2️⃣ Instalar dependências
npm install
3️⃣ Criar o arquivo .env.development
PORT=3000
GCS_BUCKET=nome-do-seu-bucket
GOOGLE_APPLICATION_CREDENTIALS=./seguranca/chavedaGCP.json
4️⃣ Rodar o servidor
npm start
O serviço estará disponível em:
http://localhost:3000

🧩 Exemplo de Requisição
POST /analyticpay/:clientCode
Body:

json
Copiar código
{
  "url": "https://exemplo.com/boleto.pdf"
}


