import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col items-center gap-6 py-20 text-center lg:py-28">
          <Badge variant="orange">Phase 1 — Design system + layout</Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-navy lg:text-h1-hero">
            Former les gardiens de demain
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">
            L&apos;académie de gardiens de but du Chablais valaisan. Header,
            footer et composants UI sont en place — les pages publiques arrivent
            en phase 3.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/offres">Découvrir les offres</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Nous contacter</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Badge variant="muted">Aperçu composants</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            Briques du design system
          </h2>
          <p className="max-w-2xl text-grey-500">
            Boutons, badges, cartes — le socle visuel commun à toutes les pages.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Formules enfants</CardTitle>
              <CardDescription>Annuel ou mensuel</CardDescription>
            </CardHeader>
            <CardContent>
              1 à 2 séances par semaine, suivi individuel, matériel fourni.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stages vacances</CardTitle>
              <CardDescription>Pâques · Été · Automne</CardDescription>
            </CardHeader>
            <CardContent>
              Camps de perfectionnement par tranches d&apos;âge, demi-journée ou
              journée complète.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contrats clubs</CardTitle>
              <CardDescription>Prestation B2B annuelle</CardDescription>
            </CardHeader>
            <CardContent>
              Intervention dans votre club pour former tous vos gardiens, toutes
              équipes confondues.
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
