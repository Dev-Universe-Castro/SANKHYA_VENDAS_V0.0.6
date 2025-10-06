
import axios from 'axios';

// Serviço de gerenciamento de leads integrado com Sankhya
export interface Lead {
  CODLEED: string
  NOME: string
  DESCRICAO: string
  VALOR: number
  ESTAGIO: 'Leads' | 'Discovery' | 'Demo' | 'Won'
  DATA_VENCIMENTO: string
  TIPO_TAG: string
  COR_TAG: string
  CODPARC?: string
  ATIVO: string
  DATA_CRIACAO: string
  DATA_ATUALIZACAO: string
}

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_CONSULTA_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
const URL_SAVE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";

const LOGIN_HEADERS = {
  'token': "c3744c65-acd9-4d36-aa35-49ecb13aa774",
  'appkey': "79bf09c7-7aa9-4ac6-b8a4-0c3aa7acfcae",
  'username': "renan.silva@sankhya.com.br",
  'password': "Integracao123!"
};

let cachedToken: string | null = null;

async function obterToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const resposta = await axios.post(ENDPOINT_LOGIN, {}, {
      headers: LOGIN_HEADERS,
      timeout: 10000
    });

    const token = resposta.data.bearerToken || resposta.data.token;

    if (!token) {
      throw new Error("Token não encontrado na resposta de login.");
    }

    cachedToken = token;
    return token;

  } catch (erro: any) {
    cachedToken = null;
    throw new Error(`Falha na autenticação Sankhya: ${erro.message}`);
  }
}

async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}) {
  const token = await obterToken();

  try {
    const config = {
      method: method.toLowerCase(),
      url: fullUrl,
      data: data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const resposta = await axios(config);
    return resposta.data;

  } catch (erro: any) {
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;
      throw new Error("Sessão expirada. Tente novamente.");
    }

    const errorDetails = erro.response?.data || erro.message;
    console.error("❌ Erro na requisição Sankhya:", {
      url: fullUrl,
      method,
      error: errorDetails
    });

    throw new Error(`Falha na comunicação com a API Sankhya: ${JSON.stringify(errorDetails)}`);
  }
}

function mapearLeeds(entities: any): Lead[] {
  if (!entities || !entities.entity) {
    return [];
  }

  const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
  const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];
  
  return entityArray.map((rawEntity: any) => {
    const cleanObject: any = {};
    
    // Adiciona o CODLEED do campo de chave primária
    if (rawEntity.CODLEED) {
      cleanObject.CODLEED = rawEntity.CODLEED.$;
    }
    
    // Mapeia os outros campos
    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];
      
      if (rawEntity[fieldKey]) {
        cleanObject[fieldName] = rawEntity[fieldKey].$;
      }
    }
    
    return cleanObject as Lead;
  });
}

export async function consultarLeads(): Promise<Lead[]> {
  const LEADS_PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "AD_LEEDS",
        "includePresentationFields": "S",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "NOME, DESCRICAO, VALOR, ESTAGIO, DATA_VENCIMENTO, TIPO_TAG, COR_TAG, CODPARC, ATIVO, DATA_CRIACAO, DATA_ATUALIZACAO"
          }
        },
        "criteria": {
          "expression": {
            "$": "ATIVO = 'S'"
          }
        }
      }
    }
  };

  try {
    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      LEADS_PAYLOAD
    );

    console.log("📥 Resposta completa da consulta:", JSON.stringify(respostaCompleta, null, 2));

    // Validação segura da estrutura da resposta
    if (!respostaCompleta || !respostaCompleta.responseBody) {
      console.warn("⚠️ Resposta sem responseBody");
      return [];
    }

    const responseBody = respostaCompleta.responseBody;
    
    // Verificar se há entities
    if (!responseBody.entities) {
      console.warn("⚠️ Nenhum entities na resposta");
      return [];
    }

    const entities = responseBody.entities;
    
    // Verificar se entities tem a propriedade entity
    if (!entities.entity) {
      console.warn("⚠️ Nenhum entity encontrado");
      return [];
    }

    const leads = mapearLeeds(entities);
    console.log("✅ Leads mapeados:", leads);
    
    return leads;

  } catch (erro) {
    console.error("❌ Erro ao consultar leads:", erro);
    return [];
  }
}

export async function salvarLead(lead: Partial<Lead>): Promise<Lead> {
  const isUpdate = !!lead.CODLEED;
  
  // Converter data de YYYY-MM-DD para DD/MM/YYYY
  const formatarData = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  
  const currentDate = formatarData(new Date().toISOString().split('T')[0]);

  let fields: string[];
  let values: Record<string, any>;
  let record: any;

  if (isUpdate) {
    // Atualização - inclui pk e apenas campos que serão atualizados
    fields = [
      "CODLEED",
      "NOME",
      "DESCRICAO",
      "VALOR",
      "ESTAGIO",
      "DATA_VENCIMENTO",
      "TIPO_TAG",
      "COR_TAG",
      "DATA_ATUALIZACAO"
    ];

    values = {
      "1": lead.NOME || "",
      "2": lead.DESCRICAO || "",
      "3": String(lead.VALOR || 0),
      "4": lead.ESTAGIO || "Leads",
      "5": lead.DATA_VENCIMENTO ? formatarData(lead.DATA_VENCIMENTO) : "",
      "6": lead.TIPO_TAG || "",
      "7": lead.COR_TAG || "#3b82f6",
      "8": currentDate
    };

    record = {
      pk: {
        CODLEED: String(lead.CODLEED)
      },
      values: values
    };
  } else {
    // Criação - inclui CODPARC obrigatório
    fields = [
      "NOME",
      "DESCRICAO",
      "VALOR",
      "ESTAGIO",
      "DATA_VENCIMENTO",
      "TIPO_TAG",
      "COR_TAG",
      "CODPARC",
      "ATIVO",
      "DATA_CRIACAO",
      "DATA_ATUALIZACAO"
    ];

    values = {
      "0": lead.NOME || "",
      "1": lead.DESCRICAO || "",
      "2": String(lead.VALOR || 0),
      "3": lead.ESTAGIO || "Leads",
      "4": lead.DATA_VENCIMENTO ? formatarData(lead.DATA_VENCIMENTO) : "",
      "5": lead.TIPO_TAG || "",
      "6": lead.COR_TAG || "#3b82f6",
      "7": String(lead.CODPARC || ""),
      "8": "S",
      "9": currentDate,
      "10": currentDate
    };

    record = {
      values: values
    };
  }

  const SAVE_PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_LEEDS",
      "standAlone": false,
      "fields": fields,
      "records": [record]
    }
  };

  try {
    console.log("📤 Salvando lead:", SAVE_PAYLOAD);
    
    const resposta = await fazerRequisicaoAutenticada(
      URL_SAVE_SERVICO,
      'POST',
      SAVE_PAYLOAD
    );

    console.log("✅ Lead salvo com sucesso:", resposta);
    
    // Recarregar o lead atualizado
    const leads = await consultarLeads();
    const leadSalvo = isUpdate 
      ? leads.find(l => l.CODLEED === lead.CODLEED)
      : leads[leads.length - 1];
    
    return leadSalvo || resposta.responseBody;

  } catch (erro: any) {
    console.error("❌ Erro ao salvar lead:", {
      message: erro.message,
      payload: SAVE_PAYLOAD
    });
    throw erro;
  }
}

export async function atualizarEstagioLead(codLeed: string, novoEstagio: Lead['ESTAGIO']): Promise<Lead> {
  const formatarData = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  
  const currentDate = formatarData(new Date().toISOString().split('T')[0]);

  const UPDATE_PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_LEEDS",
      "standAlone": false,
      "fields": [
        "CODLEED",
        "ESTAGIO",
        "DATA_ATUALIZACAO"
      ],
      "records": [
        {
          "pk": {
            "CODLEED": String(codLeed)
          },
          "values": {
            "1": novoEstagio,
            "2": currentDate
          }
        }
      ]
    }
  };

  try {
    console.log("📤 Atualizando estágio:", UPDATE_PAYLOAD);
    
    const resposta = await fazerRequisicaoAutenticada(
      URL_SAVE_SERVICO,
      'POST',
      UPDATE_PAYLOAD
    );

    console.log("✅ Estágio atualizado:", resposta);

    // Recarregar o lead atualizado
    const leads = await consultarLeads();
    const leadAtualizado = leads.find(l => l.CODLEED === codLeed);
    
    return leadAtualizado || resposta.responseBody;

  } catch (erro: any) {
    console.error("❌ Erro ao atualizar estágio:", {
      message: erro.message,
      payload: UPDATE_PAYLOAD
    });
    throw erro;
  }
}

export async function deletarLead(codLeed: string): Promise<void> {
  const formatarData = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  
  const currentDate = formatarData(new Date().toISOString().split('T')[0]);

  const DELETE_PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_LEEDS",
      "standAlone": false,
      "fields": [
        "CODLEED",
        "ATIVO",
        "DATA_ATUALIZACAO"
      ],
      "records": [
        {
          "pk": {
            "CODLEED": String(codLeed)
          },
          "values": {
            "1": "N",
            "2": currentDate
          }
        }
      ]
    }
  };

  try {
    await fazerRequisicaoAutenticada(
      URL_SAVE_SERVICO,
      'POST',
      DELETE_PAYLOAD
    );

  } catch (erro: any) {
    console.error("Erro ao deletar lead:", erro);
    throw erro;
  }
}
