import { supabaseAdmin } from "./supabase";
import { getFiscalProduct, money, onlyDigits } from "./fiscal";
import type { InvoiceInput } from "./fiscal";

type BlingTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error_description?: string;
  [key: string]: unknown;
};

type NormalizedBlingTokenResponse = BlingTokenResponse & {
  access_token: string;
  refresh_token: string;
};

type BlingTokenRow = {
  id: string;
  access_token: string;
  refresh_token: string;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
};

type BlingOrderInput = InvoiceInput & {
  unitPrice?: number | null;
  totalPrice?: number | null;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável ${name} não configurada.`);
  }

  return value;
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

function getBlingAuthUrl() {
  return optionalEnv("BLING_AUTH_URL", "https://www.bling.com.br/Api/v3/oauth/authorize");
}

function getBlingTokenUrl() {
  return optionalEnv("BLING_TOKEN_URL", "https://www.bling.com.br/Api/v3/oauth/token");
}

function getBlingApiBaseUrl() {
  return optionalEnv("BLING_API_BASE_URL", "https://api.bling.com.br/Api/v3").replace(/\/$/, "");
}

function getBasicAuthHeader() {
  const clientId = requireEnv("BLING_CLIENT_ID");
  const clientSecret = requireEnv("BLING_CLIENT_SECRET");
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  return `Basic ${token}`;
}

function buildExpiresAt(expiresIn?: number) {
  if (!expiresIn) return null;

  const safetySeconds = 60;
  return new Date(Date.now() + Math.max(0, expiresIn - safetySeconds) * 1000).toISOString();
}

function normalizeTokenResponse(data: BlingTokenResponse, fallbackRefreshToken?: string): NormalizedBlingTokenResponse {
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || fallbackRefreshToken;

  if (!accessToken) {
    throw new Error("Bling não retornou access_token.");
  }

  if (!refreshToken) {
    throw new Error("Bling não retornou refresh_token.");
  }

  return {
    ...data,
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

async function saveBlingTokens(data: BlingTokenResponse, fallbackRefreshToken?: string) {
  const tokenData = normalizeTokenResponse(data, fallbackRefreshToken);

  const { error } = await supabaseAdmin.from("bling_tokens").insert({
    provider: "bling",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_type: tokenData.token_type || "Bearer",
    scope: tokenData.scope || null,
    expires_at: buildExpiresAt(tokenData.expires_in),
    raw_response: tokenData,
  });

  if (error) {
    throw new Error(`Erro ao salvar tokens do Bling no Supabase: ${error.message}`);
  }
}

async function requestBlingToken(params: URLSearchParams) {
  const response = await fetch(getBlingTokenUrl(), {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  const data = (await response.json().catch(() => null)) as BlingTokenResponse | null;

  if (!response.ok || !data) {
    throw new Error(data?.error_description || "Não foi possível autenticar no Bling.");
  }

  return data;
}

export function buildBlingAuthorizationUrl(state?: string) {
  const url = new URL(getBlingAuthUrl());

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", requireEnv("BLING_CLIENT_ID"));
  url.searchParams.set("redirect_uri", requireEnv("BLING_REDIRECT_URI"));

  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
}

export async function exchangeBlingCodeForTokens(code: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: requireEnv("BLING_REDIRECT_URI"),
  });

  const data = await requestBlingToken(params);
  await saveBlingTokens(data);

  return data;
}

async function getLatestBlingTokens() {
  const { data, error } = await supabaseAdmin
    .from("bling_tokens")
    .select("id, access_token, refresh_token, token_type, scope, expires_at")
    .eq("provider", "bling")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar tokens do Bling no Supabase: ${error.message}`);
  }

  return data as BlingTokenRow | null;
}

function shouldRefreshToken(token: BlingTokenRow) {
  if (!token.expires_at) return false;

  return new Date(token.expires_at).getTime() <= Date.now() + 5 * 60 * 1000;
}

async function refreshBlingTokens(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const data = await requestBlingToken(params);
  await saveBlingTokens(data, refreshToken);

  return data;
}

export async function getValidBlingAccessToken() {
  const latestToken = await getLatestBlingTokens();

  if (!latestToken) {
    throw new Error("Bling ainda não foi autorizado. Acesse /api/bling/oauth/start para conectar.");
  }

  if (!shouldRefreshToken(latestToken)) {
    return latestToken.access_token;
  }

  const refreshed = await refreshBlingTokens(latestToken.refresh_token);
  const normalized = normalizeTokenResponse(refreshed, latestToken.refresh_token);

  return normalized.access_token;
}

export async function blingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getValidBlingAccessToken();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${getBlingApiBaseUrl()}${normalizedPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const data = (await response.json().catch(() => null)) as T & {
    error?: string;
    mensagem?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data?.error || data?.mensagem || data?.message || "Erro ao chamar API do Bling.");
  }

  return data as T;
}

export function buildBlingSaleOrderPayload(input: BlingOrderInput) {
  const product = getFiscalProduct(input.productId);

  if (!product) {
    throw new Error("Produto fiscal não encontrado para enviar ao Bling.");
  }

  const quantity = Math.max(1, Number(input.quantity || 1));
  const unitPrice = Number(input.unitPrice || product.price);
  const totalPrice = Number(input.totalPrice || unitPrice * quantity);
  const today = new Date().toISOString().slice(0, 10);

  return {
    numero: input.orderId,
    data: today,
    dataSaida: today,
    contato: {
      nome: input.customer.name,
      tipoPessoa: "F",
      numeroDocumento: onlyDigits(input.customer.cpf),
      email: input.customer.email,
      telefone: onlyDigits(input.customer.phone),
      endereco: {
        geral: {
          endereco: input.customer.street,
          numero: input.customer.number,
          complemento: input.customer.complement || "",
          bairro: input.customer.neighborhood,
          municipio: input.customer.city,
          uf: input.customer.state.toUpperCase(),
          cep: onlyDigits(input.customer.cep),
        },
      },
    },
    itens: [
      {
        codigo: product.code,
        descricao: product.name,
        unidade: "UN",
        quantidade: quantity,
        valor: Number(money(unitPrice)),
      },
    ],
    parcelas: [
      {
        dataVencimento: today,
        valor: Number(money(totalPrice)),
      },
    ],
    transporte: {
      fretePorConta: 9,
    },
    observacoes: `Venda online Barão da Cunha. Pedido ${input.orderId}. Pagamento: ${input.paymentMethod || "Mercado Pago"}.`,
  };
}

export async function createBlingSaleOrder(input: BlingOrderInput) {
  const payload = buildBlingSaleOrderPayload(input);

  return blingRequest<{ data?: { id?: number | string }; [key: string]: unknown }>("/pedidos/vendas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
