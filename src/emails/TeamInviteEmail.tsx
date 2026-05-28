import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components'
import * as React from 'react'

interface TeamInviteEmailProps {
  inviterName: string
  orgName: string
  inviteUrl: string
  role: 'admin' | 'operator'
}

export const TeamInviteEmail = ({
  inviterName = 'Un miembro de tu equipo',
  orgName = 'WazzAI',
  inviteUrl = 'https://wazzai.com/auth/register?invite=xxx',
  role = 'operator',
}: TeamInviteEmailProps) => {
  const roleText = role === 'admin' ? 'Administrador' : 'Operador'
  
  return (
    <Html>
      <Head />
      <Preview>{inviterName} te ha invitado a unirte a {orgName} en WazzAI</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Invitación a equipo</Heading>
          
          <Text style={text}>
            ¡Hola!
            <br />
            <br />
            <strong>{inviterName}</strong> te ha invitado a unirte a su organización <strong>{orgName}</strong> en WazzAI con el rol de <strong>{roleText}</strong>.
          </Text>
          
          <Text style={text}>
            WazzAI es la plataforma que usa tu equipo para gestionar WhatsApp con Inteligencia Artificial.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Aceptar invitación
            </Button>
          </Section>
          
          <Text style={text}>
            O copia y pega este enlace en tu navegador:
            <br />
            <Link style={link} href={inviteUrl}>
              {inviteUrl}
            </Link>
          </Text>
          
          <Text style={footer}>
            Si no esperabas esta invitación, puedes ignorar este correo de forma segura.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TeamInviteEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  maxWidth: '600px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
}

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0ea5e9',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  fontWeight: 'bold',
}

const link = {
  color: '#0ea5e9',
  textDecoration: 'underline',
}

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  marginTop: '48px',
  textAlign: 'center' as const,
}
