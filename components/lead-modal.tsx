"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Lead } from "@/lib/leads-service"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LeadModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSave: () => void
}

interface Partner {
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
}

const ESTAGIOS = ['Leads', 'Discovery', 'Demo', 'Won'] as const
const TIPOS_TAG = [
  'Ads Production',
  'Landing Page',
  'Dashboard',
  'UX Design',
  'Video Production',
  'Typeface',
  'Web Design'
]

export function LeadModal({ isOpen, onClose, lead, onSave }: LeadModalProps) {
  const [formData, setFormData] = useState({
    NOME: "",
    DESCRICAO: "",
    VALOR: 0,
    ESTAGIO: "Leads" as Lead['ESTAGIO'],
    DATA_VENCIMENTO: "",
    TIPO_TAG: "",
    COR_TAG: "#3b82f6",
    CODPARC: "", // Added CODPARC to formData
  })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [partnerSearch, setPartnerSearch] = useState("")

  useEffect(() => {
    if (lead) {
      setFormData({
        NOME: lead.NOME || "",
        DESCRICAO: lead.DESCRICAO || "",
        VALOR: lead.VALOR || 0,
        ESTAGIO: lead.ESTAGIO || "Leads",
        DATA_VENCIMENTO: lead.DATA_VENCIMENTO || "",
        TIPO_TAG: lead.TIPO_TAG || "",
        COR_TAG: lead.COR_TAG || "#3b82f6",
        CODPARC: lead.CODPARC || "", // Initialize CODPARC if lead exists
      })
    } else {
      setFormData({
        NOME: "",
        DESCRICAO: "",
        VALOR: 0,
        ESTAGIO: "Leads",
        DATA_VENCIMENTO: "",
        TIPO_TAG: "",
        COR_TAG: "#3b82f6",
        CODPARC: "", // Initialize CODPARC for new leads
      })
    }
  }, [lead, isOpen])

  // Load partners when the modal is opened
  useEffect(() => {
    if (isOpen) {
      loadPartners()
    }
  }, [isOpen])

  const loadPartners = async (searchTerm: string = "") => {
    try {
      setIsLoadingPartners(true)
      // Construct the API URL with search term
      const url = `/api/sankhya/parceiros?page=1&pageSize=50&searchName=${encodeURIComponent(searchTerm)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Falha ao carregar parceiros')
      }

      const data = await response.json()
      setPartners(data.parceiros || [])
    } catch (error) {
      console.error("Erro ao carregar parceiros:", error)
      setPartners([])
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const handlePartnerSearch = (value: string) => {
    setPartnerSearch(value)
    // Load partners if search term is 2 or more characters, or clear search if empty
    if (value.length >= 2) {
      loadPartners(value)
    } else if (value.length === 0) {
      loadPartners()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Validate that a partner has been selected
    if (!formData.CODPARC) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione um parceiro.",
        variant: "warning",
      })
      setIsSaving(false)
      return
    }

    try {
      const dataToSave = {
        ...(lead && { CODLEED: lead.CODLEED }),
        ...formData
      }

      const response = await fetch('/api/leads/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao salvar lead')
      }

      toast({
        title: "Sucesso",
        description: lead ? "Lead atualizado com sucesso!" : "Lead criado com sucesso!",
      })

      onSave()
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar:", error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar lead",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {lead ? "Editar Lead" : "Novo Lead"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Partner Selector */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="parceiro" className="text-sm font-medium text-foreground">
                Parceiro *
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.CODPARC}
                  onValueChange={(value) =>
                    setFormData({ ...formData, CODPARC: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar parceiro..."
                          value={partnerSearch}
                          onChange={(e) => handlePartnerSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    {isLoadingPartners ? (
                      <SelectItem value="loading" disabled>
                        Carregando...
                      </SelectItem>
                    ) : partners.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Nenhum parceiro encontrado
                      </SelectItem>
                    ) : (
                      partners.map((partner) => (
                        <SelectItem key={partner.CODPARC} value={partner.CODPARC}>
                          {partner.NOMEPARC} - {partner.CGC_CPF}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* End Partner Selector */}

            <div className="space-y-2">
              <Label htmlFor="NOME" className="text-sm font-medium text-foreground">
                Nome do Lead *
              </Label>
              <Input
                id="NOME"
                type="text"
                value={formData.NOME}
                onChange={(e) => setFormData({ ...formData, NOME: e.target.value })}
                className="bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="VALOR" className="text-sm font-medium text-foreground">
                Valor (USD) *
              </Label>
              <Input
                id="VALOR"
                type="number"
                value={formData.VALOR}
                onChange={(e) => setFormData({ ...formData, VALOR: Number(e.target.value) })}
                className="bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ESTAGIO" className="text-sm font-medium text-foreground">
                Estágio *
              </Label>
              <select
                id="ESTAGIO"
                value={formData.ESTAGIO}
                onChange={(e) => setFormData({ ...formData, ESTAGIO: e.target.value as Lead['ESTAGIO'] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {ESTAGIOS.map((estagio) => (
                  <option key={estagio} value={estagio}>
                    {estagio}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="DATA_VENCIMENTO" className="text-sm font-medium text-foreground">
                Data de Vencimento *
              </Label>
              <Input
                id="DATA_VENCIMENTO"
                type="date"
                value={formData.DATA_VENCIMENTO}
                onChange={(e) => setFormData({ ...formData, DATA_VENCIMENTO: e.target.value })}
                className="bg-background"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="TIPO_TAG" className="text-sm font-medium text-foreground">
                Tipo de Tag *
              </Label>
              <select
                id="TIPO_TAG"
                value={formData.TIPO_TAG}
                onChange={(e) => setFormData({ ...formData, TIPO_TAG: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Selecione uma tag</option>
                {TIPOS_TAG.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="DESCRICAO" className="text-sm font-medium text-foreground">
                Descrição *
              </Label>
              <Textarea
                id="DESCRICAO"
                value={formData.DESCRICAO}
                onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                className="bg-background min-h-[100px]"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : (lead ? "Atualizar" : "Criar")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}