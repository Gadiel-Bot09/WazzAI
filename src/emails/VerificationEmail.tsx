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

interface VerificationEmailProps {
  fullName: string
  verificationUrl: string
}

export const VerificationEmail = ({
  fullName = 'Usuario',
  verificationUrl = 'https://wazzai.com/auth/callback?code=xxx',
}: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verifica tu correo para activar tu cuenta de WazzAI</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>¡Bienvenido a WazzAI, {fullName}!</Heading>
          
          <Text style={text}>
            Estamos muy emocionados de tenerte con nosotros. Para empezar a gestionar tu WhatsApp con Inteligencia Artificial, primero necesitamos que verifiques tu dirección de correo electrónico.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Verificar mi correo
            </Button>
          </Section>
          
          <Text style={text}>
            O copia y pega esta URL en tu navegador:
            <br />
            <Link style={link} href={verificationUrl}>
              {verificationUrl}
            </Link>
          </Text>
          
          <Text style={footer}>
            Si no solicitaste crear una cuenta en WazzAI, puedes ignorar este correo de forma segura.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default VerificationEmail

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
  backgroundColor: '#0ea5e9', // primary color
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
