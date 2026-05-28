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

interface ResetPasswordEmailProps {
  resetPasswordUrl: string
}

export const ResetPasswordEmail = ({
  resetPasswordUrl = 'https://wazzai.com/auth/reset-password?code=xxx',
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Restablece tu contraseña de WazzAI</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Restablecer contraseña</Heading>
          
          <Text style={text}>
            Hemos recibido una solicitud para cambiar tu contraseña en WazzAI. Puedes hacerlo haciendo clic en el siguiente botón:
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={resetPasswordUrl}>
              Cambiar mi contraseña
            </Button>
          </Section>
          
          <Text style={text}>
            O copia y pega este enlace en tu navegador:
            <br />
            <Link style={link} href={resetPasswordUrl}>
              {resetPasswordUrl}
            </Link>
          </Text>
          
          <Text style={footer}>
            Si no solicitaste un cambio de contraseña, ignora este correo. Tu cuenta seguirá segura. El enlace expirará en 24 horas.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ResetPasswordEmail

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
