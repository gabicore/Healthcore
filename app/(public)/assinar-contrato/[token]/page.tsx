import { SignContractView } from './sign-contract-view'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function AssinarContratoPage({ params }: PageProps) {
  const { token } = await params
  return <SignContractView token={decodeURIComponent(token)} />
}
