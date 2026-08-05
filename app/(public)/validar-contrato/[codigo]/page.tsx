import { ValidateContractView } from './validate-contract-view'

type PageProps = {
  params: Promise<{ codigo: string }>
}

export default async function ValidarContratoPage({ params }: PageProps) {
  const { codigo } = await params
  return <ValidateContractView codigo={decodeURIComponent(codigo)} />
}
