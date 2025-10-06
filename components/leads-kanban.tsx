"use client"

import { useState, useEffect } from "react"
import { Search, Plus, MoreHorizontal, Calendar, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LeadModal } from "@/components/lead-modal"
import { useToast } from "@/hooks/use-toast"
import { consultarLeads, atualizarEstagioLead, type Lead } from "@/lib/leads-service"

const ESTAGIOS = [
  { id: 'Leads', label: 'Leads', color: 'bg-blue-500' },
  { id: 'Discovery', label: 'Discovery', color: 'bg-purple-500' },
  { id: 'Demo', label: 'Demo', color: 'bg-orange-500' },
  { id: 'Won', label: 'Won', color: 'bg-green-500' }
] as const

const TAG_COLORS: Record<string, string> = {
  'Ads Production': 'bg-blue-100 text-blue-700',
  'Landing Page': 'bg-red-100 text-red-700',
  'Dashboard': 'bg-green-100 text-green-700',
  'UX Design': 'bg-pink-100 text-pink-700',
  'Video Production': 'bg-amber-100 text-amber-700',
  'Typeface': 'bg-cyan-100 text-cyan-700',
  'Web Design': 'bg-purple-100 text-purple-700'
}

export default function LeadsKanban() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/leads')
      if (!response.ok) throw new Error('Falha ao carregar leads')
      const data = await response.json()
      setLeads(data)
    } catch (error) {
      console.error("Erro ao carregar leads:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar leads",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedLead(null)
    setIsModalOpen(true)
  }

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    await loadLeads()
    setIsModalOpen(false)
    toast({
      title: "Sucesso",
      description: selectedLead ? "Lead atualizado com sucesso" : "Lead criado com sucesso",
    })
  }

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (estagio: Lead['ESTAGIO']) => {
    if (!draggedLead) return

    try {
      const response = await fetch('/api/leads/atualizar-estagio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codLeed: draggedLead.CODLEED, novoEstagio: estagio })
      })
      if (!response.ok) throw new Error('Falha ao atualizar estágio')
      loadLeads()
    } catch (error) {
      console.error("Erro ao atualizar estágio:", error)
      toast({
        title: "Erro",
        description: "Falha ao atualizar estágio",
        variant: "destructive",
      })
    } finally {
      setDraggedLead(null)
    }
  }

  const getLeadsByEstagio = (estagio: Lead['ESTAGIO']) => {
    return leads.filter(lead => {
      const matchesSearch = lead.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.DESCRICAO.toLowerCase().includes(searchTerm.toLowerCase())
      return lead.ESTAGIO === estagio && matchesSearch
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Leads</h1>
        <Button
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search deals"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <span>Filter</span>
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <span>Sort</span>
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <span>Group</span>
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ESTAGIOS.map((estagio) => {
          const leadsList = getLeadsByEstagio(estagio.id)
          const totalValue = leadsList.reduce((sum, lead) => sum + lead.VALOR, 0)

          return (
            <div
              key={estagio.id}
              className="bg-muted/30 rounded-lg p-4 min-h-[600px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(estagio.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${estagio.color}`} />
                  <h3 className="font-semibold text-foreground">{estagio.label}</h3>
                  <span className="text-sm text-muted-foreground">{leadsList.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Carregando...
                  </div>
                ) : leadsList.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhum lead
                  </div>
                ) : (
                  leadsList.map((lead) => (
                    <div
                      key={lead.CODLEED}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      onClick={() => handleEdit(lead)}
                      className="bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-move border border-border"
                    >
                      <div className="space-y-3">
                        {/* Lead Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                              {lead.NOME.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-foreground">{lead.NOME}</h4>
                              <p className="text-xs text-muted-foreground">{lead.DESCRICAO}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Lead Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{formatCurrency(lead.VALOR)}</span>
                            <span className="text-muted-foreground">•</span>
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{formatDate(lead.DATA_VENCIMENTO)}</span>
                          </div>

                          {/* Tag */}
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-md font-medium ${TAG_COLORS[lead.TIPO_TAG] || 'bg-gray-100 text-gray-700'}`}>
                              {lead.TIPO_TAG}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column Footer */}
              {leadsList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-sm font-semibold text-foreground">
                    Total: {formatCurrency(totalValue)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lead={selectedLead}
        onSave={handleSave}
      />
    </div>
  )
}